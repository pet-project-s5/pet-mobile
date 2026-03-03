import { View, StyleSheet } from 'react-native';
import { CircleCheck } from 'lucide-react-native';

export default function Stepper({ currentStep = 0 }) {
  const renderStepContent = (stepIndex) => {
    if (stepIndex < currentStep) {
      return <CircleCheck size={18} color="#2794AD" strokeWidth={2.5} />;
    }
    return (
      <View
        style={
          stepIndex === currentStep
            ? styles.stepperStatusActive
            : styles.stepperStatusInactive
        }
      />
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.stepperRow}>
        <View style={styles.stepper}>{renderStepContent(0)}</View>

        <View style={[styles.line, currentStep > 0 && styles.lineCompleted]} />

        <View style={styles.stepper}>{renderStepContent(1)}</View>

        <View style={[styles.line, currentStep > 1 && styles.lineCompleted]} />

        <View style={styles.stepper}>{renderStepContent(2)}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '80%',
    paddingVertical: 18,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  stepper: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 34,
    height: 34,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  line: {
    flex: 1,
    height: 3,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  lineCompleted: {
    backgroundColor: '#2794AD',
  },
  stepperStatusActive: {
    width: 18,
    height: 18,
    borderRadius: 5,
    backgroundColor: '#2794AD',
  },
  stepperStatusInactive: {
    width: 18,
    height: 18,
    borderRadius: 5,
    backgroundColor: '#E0F0F5',
  },
});
