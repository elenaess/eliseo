package com.eliseo.app

import android.media.MediaPlayer
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class EliseoCallToneModule(
  reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "EliseoCallTone"

  private fun play(resourceId: Int) {
    val player =
      MediaPlayer.create(
        reactApplicationContext,
        resourceId,
      ) ?: return

    player.setOnCompletionListener {
      it.release()
    }

    player.setOnErrorListener { mediaPlayer, _, _ ->
      mediaPlayer.release()
      true
    }

    player.start()
  }

  @ReactMethod
  fun playJoin() {
    play(R.raw.eliseo_call_join)
  }

  @ReactMethod
  fun playLeave() {
    play(R.raw.eliseo_call_leave)
  }
}
