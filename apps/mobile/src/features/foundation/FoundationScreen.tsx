import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, ButtonText } from '@/components/ui/button';
import { colors, radii, space } from '@/theme/tokens';

type FoundationScreenProps = {
  eyebrow: string;
  title: string;
  description: string;
  milestone: string;
  action?: { label: string; onPress: () => void };
};

/** Phase M0 navigation scaffold, not a product-complete screen. No network or auth access. */
export function FoundationScreen({ eyebrow, title, description, milestone, action }: FoundationScreenProps) {
  return (
    <ScrollView contentContainerStyle={styles.container} accessibilityRole="scrollbar">
      <View style={styles.content}>
        <Text style={styles.brand}>RENDERLAB</Text>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text accessibilityRole="header" style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        <View style={styles.panel}>
          <Text style={styles.panelLabel}>FOUNDATION STATUS</Text>
          <Text style={styles.panelValue}>Phase M0 · development scaffold</Text>
          <Text style={styles.panelHint}>{milestone}</Text>
        </View>
        {action ? (
          <View style={styles.action}>
            <Button onPress={action.onPress} accessibilityLabel={action.label}>
              <ButtonText>{action.label}</ButtonText>
            </Button>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.canvas, padding: space.lg },
  content: { alignSelf: 'center', width: '100%', maxWidth: 600, paddingTop: space.xl },
  brand: { color: colors.accent, fontSize: 12, letterSpacing: 3, fontWeight: '700' },
  eyebrow: { color: colors.textMuted, fontSize: 13, marginTop: space.xl, marginBottom: space.sm },
  title: { color: colors.text, fontSize: 32, lineHeight: 40, fontWeight: '700' },
  description: { color: colors.textMuted, fontSize: 16, lineHeight: 25, marginTop: space.md },
  panel: { marginTop: space.xl, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface1, padding: space.lg },
  panelLabel: { color: colors.accent, fontSize: 11, letterSpacing: 1.3, fontWeight: '700' },
  panelValue: { marginTop: space.sm, color: colors.text, fontSize: 16, fontWeight: '600' },
  panelHint: { marginTop: space.sm, color: colors.textMuted, fontSize: 13, lineHeight: 20 },
  action: { alignSelf: 'flex-start', marginTop: space.lg },
});
