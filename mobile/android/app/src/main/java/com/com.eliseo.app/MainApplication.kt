package com.eliseo.app

import android.app.Application
import android.media.AudioAttributes
import com.oney.WebRTCModule.WebRTCModuleOptions
import org.webrtc.audio.JavaAudioDeviceModule
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()

    /*
     * react-native-webrtc usa Ã¡udio de chamada por padrÃ£o.
     * Para o ElÃ­seo queremos o stream de mÃ­dia, que usa o
     * volume normal do telefone e oferece saÃ­da bem mais alta.
     */
    val webRtcOptions =
      WebRTCModuleOptions.getInstance()

    val webRtcAudioAttributes =
      AudioAttributes.Builder()
        .setUsage(
          AudioAttributes.USAGE_MEDIA,
        )
        .setContentType(
          AudioAttributes.CONTENT_TYPE_SPEECH,
        )
        .build()

    webRtcOptions.audioDeviceModule =
      JavaAudioDeviceModule
        .builder(this)
        .setAudioAttributes(
          webRtcAudioAttributes,
        )
        .createAudioDeviceModule()

    loadReactNative(this)
  }
}
