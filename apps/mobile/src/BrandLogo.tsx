import { Image, StyleSheet, View } from 'react-native'
import { useAppTheme } from '@/theme'

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  const { dark } = useAppTheme()
  return (
    <View accessibilityLabel="Clankeep — Together. Organised. At home." accessibilityRole="image" style={[styles.wrap, compact && styles.wrapCompact]}>
      <Image
        resizeMode="contain"
        source={dark ? require('../assets/logo-dark.png') : require('../assets/logo.png')}
        style={[styles.image, compact && styles.imageCompact]}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { width: 210, height: 76, overflow: 'hidden', alignSelf: 'center' },
  wrapCompact: { width: 150, height: 54, alignSelf: 'flex-start' },
  image: { width: '100%', height: '100%' },
  imageCompact: { width: '100%', height: '100%' },
})
