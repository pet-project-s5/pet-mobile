import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts, DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold } from '@expo-google-fonts/dm-sans';
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import { useSettings } from '../../../contexts/SettingsContext';
import { getAnalyticsDistricts, getAnalyticsDashboard } from '../../../services/api';
import BottomNav from '../../Elements/BottomNav';
import { getIsAdm, getUserId, getUserName } from '../../../services/auth';
import { getDashboardRecommendations } from '../../../services/groqAnalytics';

const { width } = Dimensions.get('window');

const REC_THEMES = [
  { accent: '#4a9ab0', tagBg: '#d4f0e4', tagColor: '#1a6a4a' },
  { accent: '#f5c842', tagBg: '#fff0cc', tagColor: '#7b4a00' },
  { accent: '#9b59b6', tagBg: '#f0e4f8', tagColor: '#4a1a6a' },
];

function formatIntBR(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '--';
  const s = String(Math.round(Number(n)));
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function formatPctBR(p, decimals = 1) {
  if (p === null || p === undefined || Number.isNaN(Number(p))) return '--';
  return `${Number(p).toFixed(decimals).replace('.', ',')}%`;
}

function formatSignedPp(delta, decimals = 1) {
  if (delta === null || delta === undefined || Number.isNaN(Number(delta))) return '--';
  const v = Number(delta);
  const sign = v >= 0 ? '+' : '-';
  const abs = Math.abs(v);
  const absStr = abs % 1 === 0 ? abs.toFixed(0) : abs.toFixed(decimals);
  return `${sign}${absStr.replace('.', ',')}pp`;
}

function formatAbsPp(delta, decimals = 1) {
  if (delta === null || delta === undefined || Number.isNaN(Number(delta))) return '--';
  const abs = Math.abs(Number(delta));
  const absStr = abs % 1 === 0 ? abs.toFixed(0) : abs.toFixed(decimals);
  return `${absStr.replace('.', ',')}pp`;
}

function buildInsight({ elderlyDelta, childrenPct, adultsPct }) {
  if (!Number.isFinite(elderlyDelta)) return 'Perfil demográfico em análise.';
  const abs = formatAbsPp(elderlyDelta);
  if (elderlyDelta <= -3) {
    const profile = Number.isFinite(childrenPct) && childrenPct >= 24
      ? 'Perfil: bairro jovem e ativo'
      : 'Perfil: bairro em crescimento';
    return `Idosos ${abs} abaixo da média SP · ${profile}`;
  }
  if (elderlyDelta >= 3) {
    return `Idosos ${abs} acima da média SP · Perfil: bairro mais maduro`;
  }
  return 'Idosos próximos da média SP · Perfil equilibrado';
}

function computeActivityScore({ adultsPct, childrenPct, elderlyPct }) {
  let score = 3;
  if (Number.isFinite(adultsPct) && adultsPct >= 58) score += 1;
  if (Number.isFinite(childrenPct) && childrenPct >= 24) score += 1;
  if (Number.isFinite(elderlyPct) && elderlyPct >= 18) score -= 1;
  if (Number.isFinite(elderlyPct) && elderlyPct <= 12) score += 1;
  return Math.min(5, Math.max(1, score));
}

function starRating(score) {
  const full = Math.min(5, Math.max(1, score));
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}

function RecCard({ theme, accent, tagBg, tagColor, tag, emoji, title, body, leftKpi, rightKpi }) {
  return (
    <View style={[styles.recCard, theme.card]}>
      <View style={[styles.recAccent, { backgroundColor: accent }]} />
      <View style={styles.recCardTop}>
        <View style={[styles.recTag, { backgroundColor: tagBg }]}>
          <Text style={[styles.recTagText, { color: tagColor }]}>{tag}</Text>
        </View>
        <View style={styles.recIconRow}>
          <View style={styles.recIconCircle}>
            <Text style={styles.recEmoji}>{emoji}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.recCardTitle, theme.textPrimary]}>{title}</Text>
            <Text style={[styles.recCardBody, theme.textMuted]}>{body}</Text>
          </View>
        </View>
      </View>
      <View style={styles.recCardBottom}>
        <View style={styles.recKpiMini}>
          <Text style={[styles.recKpiMiniLabel, theme.textMuted]}>{leftKpi.label}</Text>
          <Text style={[styles.recKpiMiniVal, theme.textPrimary]}>{leftKpi.value}</Text>
        </View>
        <View style={styles.recKpiMini}>
          <Text style={[styles.recKpiMiniLabel, theme.textMuted]}>{rightKpi.label}</Text>
          <Text style={[styles.recKpiMiniVal, theme.textPrimary]}>{rightKpi.value}</Text>
        </View>
      </View>
    </View>
  );
}

export default function DashboardScreen({ navigation, route }) {
  const { darkMode } = useSettings();
  const insets = useSafeAreaInsets();

  const userId = route?.params?.userId ?? route?.params?.ownerId ?? getUserId();
  const userName = route?.params?.userName ?? getUserName() ?? '';
  const isAdm = typeof route?.params?.isAdm === 'boolean' ? route.params.isAdm : Boolean(getIsAdm());

  const [districts, setDistricts] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [districtPickerOpen, setDistrictPickerOpen] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);

  const [dashboard, setDashboard] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  const [aiRecs, setAiRecs] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSerifDisplay_400Regular,
  });

  useEffect(() => {
    if (isAdm) return;
    if (userId) {
      navigation?.replace('Home', { userId, userName, isAdm: false });
    } else {
      navigation?.replace('Login');
    }
  }, [isAdm, navigation, userId, userName]);

  useEffect(() => {
    if (!isAdm) return;
    let mounted = true;
    (async () => {
      setLoadingDistricts(true);
      try {
        const list = await getAnalyticsDistricts();
        if (!mounted) return;
        setDistricts(list);
        if (list.length) setSelectedDistrict((prev) => prev ?? list[0]);
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || 'Erro ao carregar distritos');
      } finally {
        if (mounted) setLoadingDistricts(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [isAdm]);

  useEffect(() => {
    if (!dashboard?.district?.region) {
      setAiRecs(null);
      return;
    }
    let mounted = true;
    setAiLoading(true);
    setAiRecs(null);

    const kpis = dashboard?.kpis;
    const input = {
      region: dashboard.district.region,
      districtName: dashboard.district.name,
      total: kpis?.total?.value,
      womenPct: kpis?.women?.pct,
      menPct: kpis?.men?.pct,
      childrenPct: kpis?.children?.pct,
      adultsPct: kpis?.adults?.pct,
      elderlyPct: kpis?.elderly?.pct,
      elderlyDelta: kpis?.elderly?.deltaPp,
      childrenDelta: kpis?.children?.deltaPp,
      adultsDelta: kpis?.adults?.deltaPp,
    };

    getDashboardRecommendations(input)
      .then((data) => {
        if (mounted) setAiRecs(data);
      })
      .catch(() => {
        if (mounted) setAiRecs(null);
      })
      .finally(() => {
        if (mounted) setAiLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [dashboard?.district?.region]);

  const theme = darkMode ? darkStyles : {};

  const displayedDistrictName = dashboard?.district?.name ?? selectedDistrict?.name ?? 'Selecione um distrito';
  const kpis = dashboard?.kpis;

  const kpiCards = useMemo(() => {
    const build = (label, kpi) => {
      const delta = Number(kpi?.deltaPp);
      return {
        label,
        value: formatIntBR(kpi?.value),
        delta: Number.isFinite(delta) ? delta : null,
      };
    };

    return [
      build('Mulheres', kpis?.women),
      build('Homens', kpis?.men),
      build('Idosos 60+', kpis?.elderly),
      build('Crianças 0-17', kpis?.children),
    ];
  }, [kpis]);

  const bars = useMemo(() => {
    return [
      { label: 'Crianças 0-17', pct: kpis?.children?.pct, color: '#f5c842' },
      { label: 'Adultos 18-59', pct: kpis?.adults?.pct, color: '#4a9ab0' },
      { label: 'Idosos 60+', pct: kpis?.elderly?.pct, color: '#e07070' },
    ];
  }, [kpis]);

  const insight = useMemo(() => {
    return buildInsight({
      elderlyDelta: kpis?.elderly?.deltaPp,
      childrenPct: kpis?.children?.pct,
      adultsPct: kpis?.adults?.pct,
    });
  }, [kpis]);

  const recKpis = useMemo(() => {
    const adultsPct = kpis?.adults?.pct;
    const childrenPct = kpis?.children?.pct;
    const elderlyPct = kpis?.elderly?.pct;

    const activity = starRating(computeActivityScore({ adultsPct, childrenPct, elderlyPct }));

    const loyalty = Number.isFinite(childrenPct)
      ? (childrenPct >= 25 ? 'Alto' : childrenPct >= 18 ? 'Médio' : 'Baixo')
      : 'Médio';

    const ticket = Number.isFinite(adultsPct)
      ? (adultsPct >= 58 ? '↑' : adultsPct >= 50 ? '→' : '↓')
      : '→';

    return [
      [
        { label: 'Adultos 18-59', value: formatPctBR(adultsPct) },
        { label: 'Crianças 0-17', value: formatPctBR(childrenPct) },
      ],
      [
        { label: 'Idosos vs média', value: formatSignedPp(kpis?.elderly?.deltaPp, 0) },
        { label: 'Perfil ativo', value: activity },
      ],
      [
        { label: 'Fidelização', value: loyalty },
        { label: 'Ticket médio', value: ticket },
      ],
    ];
  }, [kpis]);

  async function handleGenerate() {
    if (!selectedDistrict?.region || isGenerating) return;
    setError(null);
    setIsGenerating(true);
    try {
      const data = await getAnalyticsDashboard(selectedDistrict.region);
      setDashboard(data);
      if (data?.district?.region && data?.district?.name) {
        setSelectedDistrict({ region: data.district.region, name: data.district.name });
      }
      setDistrictPickerOpen(false);
    } catch (e) {
      setError(e?.message || 'Erro ao gerar dashboard');
    } finally {
      setIsGenerating(false);
    }
  }

  if (!fontsLoaded) return null;
  if (!isAdm) return null;

  const locationLabel = displayedDistrictName !== 'Selecione um distrito'
    ? `${displayedDistrictName} · São Paulo`
    : 'São Paulo';

  const navHeight = 74 + insets.bottom;

  return (
    <SafeAreaView style={[styles.safe, theme.safe]} edges={['top']}>
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} backgroundColor="#1a4a5c" />

      <View style={styles.header}>
        <Text style={[styles.headerBrand, theme.headerBrand]}>Cuddle</Text>
        <Text style={[styles.headerLabel, theme.headerLabel]}>Relatório demográfico</Text>
        <Text style={[styles.headerTitle, theme.headerTitle]} numberOfLines={1}>{displayedDistrictName}</Text>
        <Text style={[styles.headerSub, theme.headerSub]}>Análise para o mercado pet</Text>
        <View style={styles.headerAccent} />
      </View>

      <ScrollView
        style={[styles.scroll, theme.scroll]}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: navHeight + 8 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.controlsCard, theme.card]}>
          <TouchableOpacity
            style={styles.districtSelect}
            onPress={() => setDistrictPickerOpen((v) => !v)}
            disabled={loadingDistricts || isGenerating}
            activeOpacity={0.7}
          >
            <Text style={[styles.districtLabel, theme.textMuted]}>Distrito</Text>
            <Text style={[styles.districtValue, theme.textPrimary]} numberOfLines={1}>
              {selectedDistrict?.name ?? (loadingDistricts ? 'Carregando...' : 'Selecione um distrito')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.generateBtn, (!selectedDistrict || isGenerating) && styles.generateBtnDisabled]}
            onPress={handleGenerate}
            disabled={!selectedDistrict || isGenerating}
            activeOpacity={0.7}
          >
            {isGenerating ? (
              <ActivityIndicator size="small" color="#1a4a5c" />
            ) : (
              <Text style={styles.generateBtnTxt}>Gerar</Text>
            )}
          </TouchableOpacity>
        </View>

        {districtPickerOpen && (
          <View style={[styles.districtListCard, theme.card]}>
            <ScrollView style={{ maxHeight: 240 }} nestedScrollEnabled>
              {districts.map((d) => {
                const selected = selectedDistrict?.region === d.region;
                return (
                  <TouchableOpacity
                    key={d.region}
                    style={[styles.districtItem, selected && styles.districtItemSelected]}
                    onPress={() => {
                      setSelectedDistrict(d);
                      setDistrictPickerOpen(false);
                    }}
                    disabled={isGenerating}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.districtItemTxt,
                        theme.textPrimary,
                        selected && styles.districtItemTxtSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {d.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              {!districts.length && !loadingDistricts && (
                <Text style={[styles.emptyDistricts, theme.textMuted]}>Nenhum distrito encontrado.</Text>
              )}
            </ScrollView>
          </View>
        )}

        {error ? <Text style={[styles.errorText, theme.errorText]}>{error}</Text> : null}

        <View style={styles.section}>
          <Text style={[styles.secLabel, theme.secLabel]}>Visão geral</Text>
          <View style={styles.popTotal}>
            <View>
              <View style={styles.popRow}>
                <Text style={styles.popNum}>{formatIntBR(kpis?.total?.value)}</Text>
                <Text style={styles.popUnit}>habitantes</Text>
              </View>
              <Text style={styles.popSub}>{locationLabel}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.secLabel, theme.secLabel]}>Perfil demográfico</Text>
          <View style={styles.kpiGrid}>
            {kpiCards.map((k) => (
              <View key={k.label} style={[styles.kpiCard, theme.kpiCard]}>
                <Text style={[styles.kpiLabel, theme.textMuted]}>{k.label}</Text>
                <Text style={[styles.kpiVal, theme.textPrimary]}>
                  {k.value}
                  <Text style={styles.kpiUnit}> hab</Text>
                </Text>
                {k.delta === null ? (
                  <Text style={[styles.badgePlaceholder, theme.textMuted]}>--</Text>
                ) : (
                  <View style={[styles.badge, k.delta >= 0 ? styles.badgeUp : styles.badgeDown]}>
                    <Text style={[styles.badgeText, k.delta >= 0 ? styles.badgeUpText : styles.badgeDownText]}>
                      {`${formatSignedPp(k.delta)} vs média`}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.secLabel, theme.secLabel]}>Distribuição por faixa etária</Text>
          <View style={[styles.barsCard, theme.card]}>
            {bars.map((bar) => {
              const pct = Number.isFinite(bar.pct) ? bar.pct : 0;
              const pctLabel = Number.isFinite(bar.pct) ? formatPctBR(bar.pct) : '--';
              return (
                <View key={bar.label} style={styles.barRow}>
                  <Text style={[styles.barLabel, theme.textPrimary]}>{bar.label}</Text>
                  <View style={[styles.barTrack, theme.barTrack]}>
                    <View style={[styles.barFill, { width: `${Math.min(100, Math.max(0, pct))}%`, backgroundColor: bar.color }]} />
                  </View>
                  <Text style={[styles.barPct, theme.textPrimary]}>{pctLabel}</Text>
                </View>
              );
            })}
            <Text style={[styles.barHint, theme.textMuted]}>{insight}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.recHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.secLabel, theme.secLabel]}>Recomendações</Text>
              <Text style={[styles.recTitle, theme.textPrimary]}>O que os dados dizem</Text>
              <Text style={[styles.recSub, theme.textMuted]}>para o seu negócio em {displayedDistrictName}</Text>
            </View>
            <View style={styles.iaBadge}>
              <Text style={styles.iaBadgeTop}>✦ IA</Text>
            </View>
          </View>
        </View>

        {aiLoading && !aiRecs ? (
          <Text style={[styles.aiLoadingText, theme.textMuted]}>Gerando recomendações com IA...</Text>
        ) : null}

        {aiRecs?.cards?.map((card, i) => (
          <RecCard
            key={`${card.tag}-${i}`}
            theme={theme}
            accent={REC_THEMES[i]?.accent}
            tagBg={REC_THEMES[i]?.tagBg}
            tagColor={REC_THEMES[i]?.tagColor}
            tag={card.tag}
            emoji={card.emoji}
            title={card.title}
            body={card.body}
            leftKpi={recKpis[i]?.[0]}
            rightKpi={recKpis[i]?.[1]}
          />
        ))}

        <View style={styles.section}>
          <Text style={[styles.secLabel, theme.secLabel]}>Oportunidades adicionais</Text>
          <View style={styles.oppList}>
            {aiRecs?.opportunities?.map((opp, i) => (
              <View key={`${opp.title}-${i}`} style={[styles.oppItem, theme.kpiCard]}>
                <View style={styles.oppIcon}>
                  <Text style={styles.oppEmoji}>{opp.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.oppTitle, theme.textPrimary]}>{opp.title}</Text>
                  <Text style={[styles.oppBody, theme.textMuted]}>{opp.body}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.footerWrap}>
          <Text style={styles.footerLeft}>Observa Sampa</Text>
          <Text style={styles.footerBrand}>Cuddle</Text>
        </View>
      </ScrollView>

      <View style={[styles.bottomNavWrap, { height: navHeight, paddingBottom: insets.bottom }]}>
        <BottomNav
          navigation={navigation}
          activeTab="dashboard"
          userId={userId}
          userName={userName}
          isAdm={isAdm}
        />
      </View>

      {isGenerating ? (
        <View style={styles.loadingOverlay} pointerEvents="auto">
          <View style={[styles.loadingBox, theme.card]}>
            <ActivityIndicator size="large" color="#f5c842" />
            <Text style={[styles.loadingTxt, theme.textPrimary]}>Gerando...</Text>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f0f8fb',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#f0f8fb',
  },
  scrollContent: {
    paddingHorizontal: 14,
  },
  header: {
    backgroundColor: '#1a4a5c',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 16,
    position: 'relative',
  },
  headerBrand: {
    position: 'absolute',
    right: 18,
    top: 14,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 11,
    color: '#f5c842',
    letterSpacing: 0.4,
  },
  headerLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 10,
    color: 'rgba(168,212,224,0.9)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  headerTitle: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 22,
    color: '#ffffff',
    lineHeight: 26,
  },
  headerSub: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: 'rgba(168,212,224,0.8)',
    marginTop: 2,
  },
  headerAccent: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    backgroundColor: '#f5c842',
  },
  controlsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(26,74,92,0.12)',
    padding: 10,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  districtSelect: { flex: 1 },
  districtLabel: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 9,
    color: '#5a7a88',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  districtValue: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: '#1a4a5c',
    marginTop: 2,
  },
  generateBtn: {
    backgroundColor: '#f5c842',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateBtnDisabled: { opacity: 0.6 },
  generateBtnTxt: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 11,
    color: '#1a4a5c',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  districtListCard: {
    marginTop: 8,
    padding: 8,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(26,74,92,0.12)',
    backgroundColor: '#ffffff',
  },
  districtItem: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  districtItemSelected: {
    borderWidth: 1,
    borderColor: '#f5c842',
    backgroundColor: 'rgba(245,200,66,0.12)',
  },
  districtItemTxt: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: '#1a4a5c',
  },
  districtItemTxtSelected: {
    fontFamily: 'DMSans_600SemiBold',
    color: '#1a4a5c',
  },
  emptyDistricts: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: '#5a7a88',
    textAlign: 'center',
    paddingVertical: 10,
  },
  errorText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: '#c0392b',
    marginTop: 8,
  },
  section: { marginTop: 12 },
  secLabel: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 9,
    color: '#1a4a5c',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    paddingBottom: 3,
    borderBottomWidth: 2,
    borderBottomColor: '#f5c842',
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  popTotal: {
    backgroundColor: '#1a4a5c',
    borderRadius: 14,
    padding: 12,
  },
  popRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  popNum: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 30,
    color: '#ffffff',
    lineHeight: 32,
  },
  popUnit: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: 'rgba(168,212,224,0.85)',
  },
  popSub: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 10,
    color: 'rgba(168,212,224,0.7)',
    marginTop: 2,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  kpiCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(26,74,92,0.1)',
    width: (width - 28 - 8) / 2,
  },
  kpiLabel: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 9,
    color: '#5a7a88',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  kpiVal: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 18,
    color: '#1a4a5c',
    lineHeight: 20,
  },
  kpiUnit: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 9,
    color: '#5a7a88',
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 6,
  },
  badgeText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 9,
  },
  badgeUp: { backgroundColor: '#e8f5e9' },
  badgeDown: { backgroundColor: '#fde8e8' },
  badgeUpText: { color: '#2e7d32' },
  badgeDownText: { color: '#c0392b' },
  badgePlaceholder: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 9,
    color: '#5a7a88',
    marginTop: 6,
  },
  barsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(26,74,92,0.1)',
  },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  barLabel: {
    width: 90,
    flexShrink: 0,
    fontFamily: 'DMSans_400Regular',
    fontSize: 10,
    color: '#1a4a5c',
  },
  barTrack: {
    flex: 1,
    height: 10,
    backgroundColor: '#d0e4ec',
    borderRadius: 5,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
  },
  barPct: {
    width: 40,
    textAlign: 'right',
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 10,
    color: '#1a4a5c',
  },
  barHint: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 9,
    color: '#5a7a88',
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(26,74,92,0.08)',
  },
  recHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  recTitle: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: '#1a4a5c',
  },
  recSub: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 10,
    color: '#5a7a88',
    marginTop: 2,
  },
  iaBadge: {
    backgroundColor: '#1a4a5c',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  iaBadgeTop: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 9,
    color: '#f5c842',
  },
  aiLoadingText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 10,
    color: '#5a7a88',
    marginTop: 6,
  },
  recCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(26,74,92,0.1)',
    marginTop: 10,
  },
  recAccent: { height: 3 },
  recCardTop: { padding: 12 },
  recTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 8,
  },
  recTagText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 8,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  recIconRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  recIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e8f4f8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recEmoji: { fontSize: 18 },
  recCardTitle: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: '#1a4a5c',
  },
  recCardBody: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: '#5a7a88',
    lineHeight: 16,
    marginTop: 4,
  },
  recCardBottom: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(26,74,92,0.08)',
  },
  recKpiMini: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  recKpiMiniLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 8.5,
    color: '#5a7a88',
  },
  recKpiMiniVal: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 11,
    color: '#1a4a5c',
  },
  oppList: { gap: 8 },
  oppItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(26,74,92,0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  oppIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e8f4f8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  oppEmoji: { fontSize: 16 },
  oppTitle: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    color: '#1a4a5c',
  },
  oppBody: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 10,
    color: '#5a7a88',
    lineHeight: 14,
    marginTop: 2,
  },
  footerWrap: {
    marginTop: 18,
    marginHorizontal: -14,
    backgroundColor: '#1a4a5c',
    paddingHorizontal: 18,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerLeft: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 9,
    color: 'rgba(168,212,224,0.7)',
  },
  footerBrand: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 10,
    color: '#f5c842',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(26,74,92,0.12)',
    backgroundColor: '#ffffff',
  },
  loadingTxt: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: '#1a4a5c',
  },
  bottomNavWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});

const darkStyles = {
  safe: { backgroundColor: '#0d1f26' },
  scroll: { backgroundColor: '#0d1f26' },
  card: { backgroundColor: '#132a33', borderColor: '#1e4455' },
  kpiCard: { backgroundColor: '#132a33', borderColor: '#1e4455' },
  barTrack: { backgroundColor: '#223a44' },
  textPrimary: { color: '#e0f4f8' },
  textMuted: { color: '#6a9aaa' },
  errorText: { color: '#e8837a' },
  secLabel: { color: '#4db8c0', borderBottomColor: '#f5c842' },
  headerLabel: { color: 'rgba(168,212,224,0.8)' },
  headerTitle: { color: '#ffffff' },
  headerSub: { color: 'rgba(168,212,224,0.7)' },
  headerBrand: { color: '#f5c842' },
};
