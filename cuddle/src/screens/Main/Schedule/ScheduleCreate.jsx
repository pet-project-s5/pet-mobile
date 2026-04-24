import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Modal, KeyboardAvoidingView, Platform, TextInput, Pressable,
} from 'react-native';
import { ChevronLeft, ChevronRight, Check, Calendar, Clock3, PawPrint, CheckCircle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getPetsByUser, getServices, getAvailableTimes, createAppointment,
} from '../../../services/api';
import LoadingView from '../../Elements/LoadingView';
import { useSettings, useT } from '../../../contexts/SettingsContext';

// ─── Service IDs allowed per species ─────────────────────────────────────────
// 1=Banho 2=Tosa higiênica 3=Tosa máquina 4=Tosa bebê 5=Botinha
// 6=Desembolo 7=Escovação dentária 8=Hidratação 9=Corte de unha
const SERVICES_BY_SPECIES = {
  cachorro: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  gato:     [1, 2, 3, 4, 5, 6, 7, 8, 9],
  coelho:   [1, 2, 3, 4, 5, 6, 7, 8, 9],
  roedor:   [1, 2, 3, 4, 5, 6, 7, 8, 9],
  ave:      [1, 2, 3, 4, 5, 6, 7, 8, 9],
  peixe:    [1, 2, 3, 4, 5, 6, 7, 8, 9],
  reptil:   [1, 2, 3, 4, 5, 6, 7, 8, 9],
  outro:    [1, 2, 3, 4, 5, 6, 7, 8, 9],
};

function getAllowedServiceIds(species) {
  if (!species) return [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const key = species.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return SERVICES_BY_SPECIES[key] ?? [1, 2, 3, 4, 5, 6, 7, 8, 9];
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function pad(n) { return String(n).padStart(2, '0'); }

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function isoToDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function dateToISO(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const MONTH_NAMES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];
const DAY_LABELS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

// ─── Calendar component ────────────────────────────────────────────────────────

function CalendarPicker({ value, onChange }) {
  const today = isoToDate(todayISO());
  const selected = value ? isoToDate(value) : null;

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <View style={calStyles.wrap}>
      {/* Month navigation */}
      <View style={calStyles.nav}>
        <TouchableOpacity onPress={prevMonth} style={calStyles.navBtn}>
          <ChevronLeft size={18} color="#2794AD" />
        </TouchableOpacity>
        <Text style={calStyles.monthLabel}>
          {MONTH_NAMES[viewMonth]} {viewYear}
        </Text>
        <TouchableOpacity onPress={nextMonth} style={calStyles.navBtn}>
          <ChevronRight size={18} color="#2794AD" />
        </TouchableOpacity>
      </View>

      {/* Day headers */}
      <View style={calStyles.row}>
        {DAY_LABELS.map((lbl, i) => (
          <Text key={i} style={[calStyles.dayHeader, i === 0 && calStyles.sundayHeader]}>
            {lbl}
          </Text>
        ))}
      </View>

      {/* Day cells */}
      {Array.from({ length: cells.length / 7 }, (_, ri) => (
        <View key={ri} style={calStyles.row}>
          {cells.slice(ri * 7, ri * 7 + 7).map((day, ci) => {
            if (!day) return <View key={ci} style={calStyles.cell} />;

            const cellDate = new Date(viewYear, viewMonth, day);
            const isSunday = ci === 0;
            const isPast = cellDate < today;
            const isToday = dateToISO(cellDate) === todayISO();
            const isSelected = selected && dateToISO(cellDate) === dateToISO(selected);
            const disabled = isSunday || isPast;

            return (
              <TouchableOpacity
                key={ci}
                style={[
                  calStyles.cell,
                  isToday && !isSelected && calStyles.todayCell,
                  isSelected && calStyles.selectedCell,
                  disabled && calStyles.disabledCell,
                ]}
                onPress={() => !disabled && onChange(dateToISO(cellDate))}
                disabled={disabled}
              >
                <Text style={[
                  calStyles.dayText,
                  isSelected && calStyles.selectedDayText,
                  disabled && calStyles.disabledDayText,
                  isToday && !isSelected && calStyles.todayText,
                ]}>
                  {day}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ─── sub-components ───────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{title}</Text>
      {children}
    </View>
  );
}

function SelectChip({ label, selected, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Row({ icon, label, value, highlight }) {
  return (
    <View style={styles.confirmRow}>
      {icon ? <View style={{ marginRight: 6 }}>{icon}</View> : null}
      <Text style={styles.confirmLabel}>{label}:</Text>
      <Text style={[styles.confirmValue, highlight && styles.confirmHighlight]}>
        {value ?? '—'}
      </Text>
    </View>
  );
}

// ─── screen ───────────────────────────────────────────────────────────────────

export default function ScheduleCreate({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { theme } = useSettings();
  const t = useT();
  const userId = route?.params?.userId;
  const userName = route?.params?.userName;
  const initialPetId = route?.params?.petId;
  const preselectedServiceId = route?.params?.preselectedServiceId;

  const [pets, setPets] = useState([]);
  const [services, setServices] = useState([]);
  const [loadingInit, setLoadingInit] = useState(true);

  // Steps: 0=pet, 1=service, 2=date, 3=times, 4=confirm
  // If preselectedServiceId exists: step 1 is skipped (service is locked)
  const [step, setStep] = useState(0);

  const [selectedPetId, setSelectedPetId] = useState(initialPetId || null);
  // Always an array; preselectedServiceId is locked (first element if present)
  const [selectedServiceIds, setSelectedServiceIds] = useState(
    preselectedServiceId ? [preselectedServiceId] : []
  );
  const [date, setDate] = useState(todayISO());

  // available times: array of { employee, times[], durationTime, petOfferingNames, servicePrice }
  const [availableOptions, setAvailableOptions] = useState([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [tooLong, setTooLong] = useState(false);

  // Selected: time string + employee object
  const [selectedTime, setSelectedTime] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const [observations, setObservations] = useState('');
  const [saving, setSaving] = useState(false);

  // Success modal
  const [successModal, setSuccessModal] = useState(false);
  const [successInfo, setSuccessInfo] = useState(null);

  useEffect(() => {
    async function init() {
      try {
        const [petData, serviceData] = await Promise.all([
          getPetsByUser(userId),
          getServices(),
        ]);
        setPets(petData);
        setServices(serviceData);
        // If pet is pre-selected, skip pet step but always show service step
        if (initialPetId) setStep(1);
      } catch {
        // silent – user will see empty lists
      } finally {
        setLoadingInit(false);
      }
    }
    init();
  }, [userId]);

  const fetchAvailableTimes = useCallback(async () => {
    if (!selectedPetId || selectedServiceIds.length === 0 || !date) return;
    setLoadingTimes(true);
    setAvailableOptions([]);
    setTooLong(false);
    setSelectedTime(null);
    setSelectedEmployee(null);
    try {
      const result = await getAvailableTimes(selectedPetId, date, selectedServiceIds);
      if (result.tooLong) {
        setTooLong(true);
        setAvailableOptions([]);
      } else {
        setAvailableOptions(result.results || []);
      }
    } catch {
      setAvailableOptions([]);
    } finally {
      setLoadingTimes(false);
    }
  }, [selectedPetId, selectedServiceIds, date]);

  // Derive unique times and employees-per-time from availableOptions
  const timeMap = {}; // { "HH:MM:SS": [{ employee, durationTime, petOfferingNames, servicePrice }] }
  for (const opt of availableOptions) {
    for (const t of opt.times || []) {
      if (!timeMap[t]) timeMap[t] = [];
      timeMap[t].push({
        employee: opt.employee,
        durationTime: opt.durationTime,
        petOfferingNames: opt.petOfferingNames,
        servicePrice: opt.servicePrice,
      });
    }
  }
  const uniqueTimes = Object.keys(timeMap).sort();

  // When a time is selected, get employees for that time
  const employeesForTime = selectedTime ? (timeMap[selectedTime] || []) : [];

  const toggleService = (id) => {
    if (id === preselectedServiceId) return;
    setTooLong(false);
    setSelectedServiceIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleNext = async () => {
    if (step === 0) {
      if (!selectedPetId) return;
      setStep(1);
    } else if (step === 1) {
      if (selectedServiceIds.length === 0) return;
      setStep(2);
    } else if (step === 2) {
      await fetchAvailableTimes();
      setStep(3);
    } else if (step === 3) {
      if (!selectedTime || !selectedEmployee) return;
      setStep(4);
    } else if (step === 4) {
      await handleConfirm();
    }
  };

  const handleConfirm = async () => {
    if (!selectedTime || !selectedEmployee || saving) return;
    setSaving(true);
    const obs = observations.trim();
    const payload = {
      petId: selectedPetId,
      employee_id: selectedEmployee.employee.id,
      petOfferingNames: selectedEmployee.petOfferingNames,
      totalPrice: selectedEmployee.servicePrice,
      ...(obs ? { observations: obs } : {}),
      startDateTime: `${date}T${selectedTime}`,
      durationMinutes: selectedEmployee.durationTime,
    };
    try {
      await createAppointment(payload);
      setSuccessInfo({
        pet: pets.find(p => p.id === selectedPetId)?.name,
        service: selectedServicesLabel,
        date,
        time: selectedTime.slice(0, 5),
        employee: selectedEmployee.employee.name,
        price: selectedEmployee.servicePrice,
      });
      setSuccessModal(true);
    } catch (e) {
      // show inline error — revert saving so user can retry
      setSaving(false);
    }
  };

  const handleSuccessClose = () => {
    setSuccessModal(false);
    navigation?.replace('Schedule', { userId, userName });
  };

  if (loadingInit) return <LoadingView message="Carregando..." />;

  const selectedPet = pets.find(p => p.id === selectedPetId);
  const allowedServiceIds = getAllowedServiceIds(selectedPet?.species);
  const filteredServices = services.filter(s => allowedServiceIds.includes(s.id));
  const selectedServicesLabel = selectedServiceIds
    .map(id => services.find(s => s.id === id)?.description)
    .filter(Boolean)
    .join(' + ');
  const canAdvance = (
    (step === 0 && selectedPetId) ||
    (step === 1 && selectedServiceIds.length > 0 && filteredServices.length > 0) ||
    step === 2 ||
    (step === 3 && selectedTime && selectedEmployee) ||
    step === 4
  );

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      {/* ── Success Modal ──────────────────────────────────────────────── */}
      <Modal visible={successModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <CheckCircle size={52} color="#2EC27E" />
            </View>
            <Text style={styles.modalTitle}>{t.appointmentConfirmed}</Text>
            {successInfo && (
              <View style={styles.modalInfo}>
                <Text style={styles.modalInfoLine}>{successInfo.pet} · {successInfo.service}</Text>
                <Text style={styles.modalInfoLine}>{successInfo.date} às {successInfo.time}</Text>
                <Text style={styles.modalInfoLine}>Profissional: {successInfo.employee}</Text>
                <Text style={[styles.modalInfoLine, { color: '#2EC27E', fontFamily: 'Kanit_700Bold' }]}>
                  R$ {Number(successInfo.price).toFixed(2)}
                </Text>
              </View>
            )}
            <Pressable style={styles.modalBtn} onPress={handleSuccessClose}>
              <Text style={styles.modalBtnText}>{t.viewAppointments}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => step > 0 ? setStep(step - 1) : navigation?.goBack()}
            >
              <ChevronLeft size={22} color="#2794AD" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Novo Agendamento</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Progress dots */}
          <View style={styles.dots}>
            {[0, 1, 2, 3, 4].map(i => (
              <View key={i} style={[styles.dot, i <= step && styles.dotActive]} />
            ))}
          </View>

          {/* ── STEP 0: Pet ─────────────────────────────────────────── */}
          {step === 0 && (
            <Section title={t.choosePet}>
              {pets.length === 0 ? (
                <Text style={styles.emptyMsg}>{t.noPets}</Text>
              ) : (
                <View style={styles.chipWrap}>
                  {pets.map(p => {
                    const allowed = getAllowedServiceIds(p.species);
                    const compatible = !preselectedServiceId || allowed.includes(preselectedServiceId);
                    return (
                      <SelectChip
                        key={p.id}
                        label={`${p.name} (${p.species})${compatible ? '' : ' ✕'}`}
                        selected={selectedPetId === p.id}
                        onPress={() => compatible ? setSelectedPetId(p.id) : null}
                      />
                    );
                  })}
                </View>
              )}
              {selectedPetId && preselectedServiceId && !getAllowedServiceIds(selectedPet?.species).includes(preselectedServiceId) && (
                <Text style={styles.dateWarning}>
                  Este serviço não está disponível para a espécie deste pet.
                </Text>
              )}
            </Section>
          )}

          {/* ── STEP 1: Serviço ─────────────────────────────────────── */}
          {step === 1 && (
            <Section title={t.chooseService}>
              {preselectedServiceId && (
                <View style={styles.lockedChipWrap}>
                  <View style={[styles.chip, styles.chipSelected, { opacity: 0.75 }]}>
                    <Text style={[styles.chipText, styles.chipTextSelected]}>
                      {services.find(s => s.id === preselectedServiceId)?.description} ✓
                    </Text>
                  </View>
                  <Text style={styles.addExtrasLabel}>{t.addExtras}</Text>
                </View>
              )}
              {filteredServices.length === 0 ? (
                <Text style={styles.emptyMsg}>{t.noServicesForSpecies}</Text>
              ) : (
                <View style={styles.chipWrap}>
                  {filteredServices
                    .filter(s => s.id !== preselectedServiceId)
                    .map(s => (
                      <SelectChip
                        key={s.id}
                        label={s.description || s.name}
                        selected={selectedServiceIds.includes(s.id)}
                        onPress={() => toggleService(s.id)}
                      />
                    ))}
                </View>
              )}
            </Section>
          )}

          {/* ── STEP 2: Data (calendário) ─────────────────────────────── */}
          {step === 2 && (
            <Section title={t.chooseDate}>
              <CalendarPicker value={date} onChange={setDate} />
              {date && (
                <View style={styles.selectedDateBadge}>
                  <Calendar size={14} color="#1E93AD" />
                  <Text style={styles.selectedDateText}>
                    {(() => {
                      const d = isoToDate(date);
                      return `${DAY_LABELS[d.getDay()]}, ${pad(d.getDate())} de ${MONTH_NAMES[d.getMonth()]}`;
                    })()}
                  </Text>
                </View>
              )}
            </Section>
          )}

          {/* ── STEP 3: Horários ─────────────────────────────────────── */}
          {step === 3 && (
            <Section title={t.chooseTime}>
              {loadingTimes ? (
                <Text style={styles.loadingMsg}>{t.loadingTimes}</Text>
              ) : tooLong ? (
                <Text style={styles.tooLongMsg}>{t.servicesTooLong ?? 'Os serviços selecionados somam mais tempo do que o horário de funcionamento. Reduza a quantidade de serviços.'}</Text>
              ) : uniqueTimes.length === 0 ? (
                <Text style={styles.emptyMsg}>{t.noAvailableTimes}</Text>
              ) : (
                <>
                  {/* Time chips grid */}
                  <View style={styles.timeGrid}>
                    {uniqueTimes.map(t => {
                      const isSelected = selectedTime === t;
                      return (
                        <TouchableOpacity
                          key={t}
                          style={[styles.timeChip, isSelected && styles.timeChipSelected]}
                          onPress={() => {
                            setSelectedTime(t);
                            // Auto-select employee if only one available
                            const emps = timeMap[t] || [];
                            setSelectedEmployee(emps.length === 1 ? emps[0] : null);
                          }}
                        >
                          <Clock3 size={12} color={isSelected ? '#fff' : '#2794AD'} />
                          <Text style={[styles.timeChipText, isSelected && styles.timeChipTextSelected]}>
                            {t.slice(0, 5)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Employee selection (shown after time is picked) */}
                  {selectedTime && employeesForTime.length > 1 && (
                    <View style={styles.employeeSection}>
                      <Text style={styles.employeeSectionLabel}>{t.chooseProfessional}</Text>
                      {employeesForTime.map(opt => {
                        const isSel = selectedEmployee?.employee?.id === opt.employee.id;
                        return (
                          <TouchableOpacity
                            key={opt.employee.id}
                            style={[styles.employeeCard, isSel && styles.employeeCardSelected]}
                            onPress={() => setSelectedEmployee(opt)}
                          >
                            <Text style={[styles.employeeName, isSel && { color: '#fff' }]}>
                              {opt.employee.name}
                            </Text>
                            <Text style={[styles.employeePrice, isSel && { color: '#ffffffcc' }]}>
                              R$ {Number(opt.servicePrice).toFixed(2)} · {opt.durationTime} min
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}

                  {/* Summary of selection */}
                  {selectedTime && selectedEmployee && (
                    <View style={styles.selectionSummary}>
                      <Check size={14} color="#2EC27E" />
                      <Text style={styles.selectionSummaryText}>
                        {selectedTime.slice(0, 5)} com {selectedEmployee.employee.name} · R$ {Number(selectedEmployee.servicePrice).toFixed(2)}
                      </Text>
                    </View>
                  )}
                </>
              )}
            </Section>
          )}

          {/* ── STEP 4: Confirmação ──────────────────────────────────── */}
          {step === 4 && (
            <Section title={t.confirmAppointmentTitle}>
              <View style={styles.confirmCard}>
                <Row icon={<PawPrint size={15} color="#2794AD" />} label={t.petLabel} value={selectedPet?.name} />
                <Row icon={<Check size={15} color="#2794AD" />} label={t.serviceLabel} value={selectedServicesLabel} />
                <Row icon={<Calendar size={15} color="#2794AD" />} label={t.dateLabel} value={(() => {
                  const d = isoToDate(date);
                  return `${DAY_LABELS[d.getDay()]}, ${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`;
                })()} />
                <Row icon={<Clock3 size={15} color="#2794AD" />} label={t.timeLabel} value={selectedTime?.slice(0, 5)} />
                <Row label={t.employee} value={selectedEmployee?.employee?.name} />
                <Row label={t.duration} value={selectedEmployee?.durationTime ? `${selectedEmployee.durationTime} min` : '—'} />
                <Row label={t.total} value={`R$ ${Number(selectedEmployee?.servicePrice || 0).toFixed(2)}`} highlight />
              </View>

              <Text style={styles.fieldLabel}>{t.obsOptional}</Text>
              <TextInput
                style={styles.obsInput}
                value={observations}
                onChangeText={setObservations}
                placeholder={t.obsPlaceholder}
                placeholderTextColor="#B1DDE7"
                multiline
                numberOfLines={3}
              />
            </Section>
          )}

          {/* Botão avançar */}
          <TouchableOpacity
            style={[styles.nextBtn, (!canAdvance || saving) && styles.nextBtnDisabled]}
            onPress={handleNext}
            disabled={!canAdvance || saving}
          >
            <Text style={styles.nextBtnText}>
              {saving ? t.saving : step === 4 ? t.confirmAppointmentBtn : t.continue}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── calendar styles ──────────────────────────────────────────────────────────

const calStyles = StyleSheet.create({
  wrap: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navBtn: {
    width: 36, height: 36,
    borderRadius: 8,
    backgroundColor: '#F0F8FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    fontFamily: 'Kanit_700Bold',
    color: '#1E5968',
    fontSize: 15,
  },
  row: {
    flexDirection: 'row',
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Kanit_700Bold',
    color: '#5FAFC2',
    fontSize: 11,
    paddingVertical: 4,
  },
  sundayHeader: {
    color: '#DA524D',
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 2,
    borderRadius: 8,
  },
  todayCell: {
    borderWidth: 1.5,
    borderColor: '#1E93AD',
  },
  selectedCell: {
    backgroundColor: '#1E93AD',
  },
  disabledCell: {
    opacity: 0.3,
  },
  dayText: {
    fontFamily: 'Kanit_400Regular',
    color: '#1E5968',
    fontSize: 13,
  },
  selectedDayText: {
    color: '#fff',
    fontFamily: 'Kanit_700Bold',
  },
  disabledDayText: {
    color: '#B1DDE7',
  },
  todayText: {
    color: '#1E93AD',
    fontFamily: 'Kanit_700Bold',
  },
});

// ─── main styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#DBE9EF' },
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backBtn: {
    width: 40, height: 40,
    borderRadius: 8,
    backgroundColor: '#F4F4F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Kanit_700Bold',
    color: '#1E5968',
    fontSize: 18,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#B1DDE7' },
  dotActive: { backgroundColor: '#1E93AD' },
  section: { marginBottom: 20 },
  sectionLabel: {
    fontFamily: 'Kanit_700Bold',
    color: '#1E5968',
    fontSize: 16,
    marginBottom: 14,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  lockedChipWrap: { marginBottom: 12, gap: 8 },
  addExtrasLabel: {
    fontFamily: 'Kanit_400Regular',
    color: '#5FAFC2',
    fontSize: 13,
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#B1DDE7',
    backgroundColor: '#fff',
  },
  chipSelected: { backgroundColor: '#1E93AD', borderColor: '#1E93AD' },
  chipText: { fontFamily: 'Kanit_400Regular', color: '#5FAFC2', fontSize: 14 },
  chipTextSelected: { color: '#fff' },

  selectedDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    backgroundColor: '#E8F6FA',
    borderRadius: 10,
    padding: 10,
  },
  selectedDateText: {
    fontFamily: 'Kanit_700Bold',
    color: '#1E5968',
    fontSize: 14,
  },

  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#B1DDE7',
    backgroundColor: '#fff',
  },
  timeChipSelected: {
    backgroundColor: '#1E93AD',
    borderColor: '#1E93AD',
  },
  timeChipText: {
    fontFamily: 'Kanit_700Bold',
    color: '#1E5968',
    fontSize: 14,
  },
  timeChipTextSelected: { color: '#fff' },

  employeeSection: { marginTop: 4, gap: 8 },
  employeeSectionLabel: {
    fontFamily: 'Kanit_700Bold',
    color: '#1E5968',
    fontSize: 14,
    marginBottom: 4,
  },
  employeeCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  employeeCardSelected: {
    backgroundColor: '#1E93AD',
    borderColor: '#1E93AD',
  },
  employeeName: {
    fontFamily: 'Kanit_700Bold',
    color: '#1E5968',
    fontSize: 14,
  },
  employeePrice: {
    fontFamily: 'Kanit_400Regular',
    color: '#5FAFC2',
    fontSize: 12,
    marginTop: 2,
  },

  selectionSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8F6FA',
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
  },
  selectionSummaryText: {
    fontFamily: 'Kanit_400Regular',
    color: '#1E5968',
    fontSize: 13,
    flex: 1,
  },

  loadingMsg: {
    fontFamily: 'Kanit_400Regular',
    color: '#5FAFC2',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },
  emptyMsg: {
    fontFamily: 'Kanit_400Regular',
    color: '#B1DDE7',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 22,
  },
  tooLongMsg: {
    fontFamily: 'Kanit_400Regular',
    color: '#DA524D',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 22,
    backgroundColor: '#FEF0EF',
    borderRadius: 10,
    padding: 14,
  },

  confirmCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    gap: 8,
  },
  confirmRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  confirmLabel: {
    fontFamily: 'Kanit_400Regular',
    color: '#5FAFC2',
    fontSize: 13,
    minWidth: 90,
  },
  confirmValue: {
    fontFamily: 'Kanit_700Bold',
    color: '#1E5968',
    fontSize: 13,
    flex: 1,
  },
  confirmHighlight: { color: '#2EC27E' },
  fieldLabel: {
    fontFamily: 'Kanit_400Regular',
    color: '#1E5968',
    fontSize: 13,
    marginBottom: 6,
  },
  obsInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    fontFamily: 'Kanit_400Regular',
    color: '#1E5968',
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },

  nextBtn: {
    marginTop: 12,
    backgroundColor: '#E4B651',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtnDisabled: { opacity: 0.45 },
  nextBtnText: {
    color: '#fff',
    fontFamily: 'Kanit_700Bold',
    fontSize: 16,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  modalIconWrap: {
    width: 80, height: 80,
    borderRadius: 40,
    backgroundColor: '#E8FBF2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontFamily: 'Kanit_700Bold',
    color: '#1E5968',
    fontSize: 20,
    textAlign: 'center',
  },
  modalInfo: { gap: 4, alignItems: 'center' },
  modalInfoLine: {
    fontFamily: 'Kanit_400Regular',
    color: '#5FAFC2',
    fontSize: 14,
    textAlign: 'center',
  },
  modalBtn: {
    marginTop: 8,
    backgroundColor: '#1E93AD',
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  modalBtnText: {
    fontFamily: 'Kanit_700Bold',
    color: '#fff',
    fontSize: 15,
  },
});
