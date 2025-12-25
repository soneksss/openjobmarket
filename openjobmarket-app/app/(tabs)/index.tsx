import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

export default function TabHomeScreen() {
  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: 'https://openjobmarket.com' }}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
