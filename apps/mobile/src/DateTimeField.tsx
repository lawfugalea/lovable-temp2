import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { fontFamilies, radii, spacing, useAppTheme } from '@/theme'
import { AppButton } from '@/ui'

function parseValue(value: string, mode: 'date' | 'datetime') {
  const parsed = mode === 'date' ? new Date(value + 'T12:00:00') : new Date(value)
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

function dateOnly(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return year + '-' + month + '-' + day
}

export function DateTimeField({
  label,
  value,
  onChange,
  mode = 'datetime',
  optional = false,
  maximumDate,
  minimumDate,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  mode?: 'date' | 'datetime'
  optional?: boolean
  maximumDate?: Date
  minimumDate?: Date
}) {
  const { colors } = useAppTheme()
  const [show, setShow] = useState(false)
  const selected = parseValue(value, mode)
  const formatted = value
    ? mode === 'date'
      ? selected.toLocaleDateString()
      : selected.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : 'Not set'

  const choose = (_event: DateTimePickerEvent, next?: Date) => {
    if (Platform.OS !== 'ios') setShow(false)
    if (!next) return
    onChange(mode === 'date' ? dateOnly(next) : next.toISOString())
  }

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <Pressable accessibilityRole="button" onPress={() => setShow(true)} style={({ pressed }) => [styles.control, { backgroundColor: colors.input, borderColor: colors.border }, pressed && styles.pressed]}>
        <Ionicons name={mode === 'date' ? 'calendar-outline' : 'time-outline'} size={20} color={colors.primary} />
        <Text style={[styles.value, { color: value ? colors.text : colors.subtle }]}>{formatted}</Text>
        <Ionicons name="chevron-down" size={18} color={colors.subtle} />
      </Pressable>
      {show ? <View style={[styles.pickerWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <DateTimePicker
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          mode={mode === 'date' ? 'date' : 'datetime'}
          value={selected}
          maximumDate={maximumDate}
          minimumDate={minimumDate}
          onChange={choose}
          themeVariant={colors.background === '#0F172A' ? 'dark' : 'light'}
        />
        {Platform.OS === 'ios' ? <View style={styles.actions}>{optional && value ? <AppButton compact variant="ghost" label="Clear" onPress={() => { onChange(''); setShow(false) }} /> : null}<AppButton compact label="Done" onPress={() => setShow(false)} /></View> : null}
      </View> : null}
      {!show && optional && value ? <Pressable onPress={() => onChange('')} style={styles.clear}><Text style={[styles.clearText, { color: colors.primary }]}>Clear date</Text></Pressable> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  field: { gap: 7 },
  label: { fontFamily: fontFamilies.bodySemiBold, fontSize: 13 },
  control: { minHeight: Platform.OS === 'ios' ? 52 : 56, borderWidth: 1, borderRadius: radii.medium, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  value: { flex: 1, fontFamily: fontFamilies.body, fontSize: 15 },
  pressed: { opacity: 0.72 },
  pickerWrap: { borderRadius: radii.large, borderWidth: 1, padding: spacing.sm, overflow: 'hidden' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, paddingHorizontal: spacing.sm, paddingBottom: spacing.sm },
  clear: { minHeight: 32, alignSelf: 'flex-start', justifyContent: 'center' },
  clearText: { fontFamily: fontFamilies.bodySemiBold, fontSize: 12 },
})

