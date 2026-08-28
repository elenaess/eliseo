package com.eliseo.app

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.media.MediaMetadata
import android.media.session.MediaController
import android.media.session.MediaSessionManager
import android.provider.Settings
import android.util.Base64
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments
import java.io.ByteArrayOutputStream

class EliseoMediaSessionModule(
  private val context: ReactApplicationContext,
) : ReactContextBaseJavaModule(context) {

  override fun getName(): String =
    "EliseoMediaSession"

  private val allowed =
    mapOf(
      "youtube_music" to
        "com.google.android.apps.youtube.music",
      "qobuz" to
        "com.qobuz.music",
    )

  @ReactMethod
  fun hasAccess(
    promise: Promise,
  ) {
    val enabled =
      Settings.Secure.getString(
        context.contentResolver,
        "enabled_notification_listeners",
      ) ?: ""

    promise.resolve(
      enabled.contains(
        context.packageName,
      ),
    )
  }

  @ReactMethod
  fun openAccessSettings(
    promise: Promise,
  ) {
    try {
      val intent =
        Intent(
          Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS,
        ).apply {
          addFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK,
          )
        }

      context.startActivity(
        intent,
      )

      promise.resolve(null)
    } catch (
      error: Exception,
    ) {
      promise.reject(
        "ELISEO_MEDIA_SETTINGS",
        error,
      )
    }
  }

  @ReactMethod
  fun getNowPlaying(
    provider: String,
    promise: Promise,
  ) {
    val packageName =
      allowed[provider]

    if (
      packageName == null
    ) {
      promise.resolve(null)
      return
    }

    try {
      val manager =
        context.getSystemService(
          Context.MEDIA_SESSION_SERVICE,
        ) as MediaSessionManager

      val listener =
        ComponentName(
          context,
          EliseoNotificationListenerService::class.java,
        )

      val controller =
        manager
          .getActiveSessions(
            listener,
          )
          .firstOrNull {
            it.packageName ==
              packageName
          }

      if (
        controller == null
      ) {
        promise.resolve(null)
        return
      }

      promise.resolve(
        toMap(
          controller,
        ),
      )
    } catch (
      error: SecurityException,
    ) {
      promise.reject(
        "ELISEO_MEDIA_PERMISSION",
        "Ative o acesso a notificações para o Elíseo.",
        error,
      )
    } catch (
      error: Exception,
    ) {
      promise.reject(
        "ELISEO_MEDIA_SESSION",
        error,
      )
    }
  }

  private fun toMap(
    controller: MediaController,
  ): WritableMap {
    val metadata =
      controller.metadata

    val state =
      controller.playbackState

    val title =
      metadata
        ?.getString(
          MediaMetadata.METADATA_KEY_TITLE,
        )
        ?: ""

    val artist =
      metadata
        ?.getString(
          MediaMetadata.METADATA_KEY_ARTIST,
        )
        ?: metadata
          ?.getString(
            MediaMetadata.METADATA_KEY_ALBUM_ARTIST,
          )
        ?: ""

    val duration =
      metadata
        ?.getLong(
          MediaMetadata.METADATA_KEY_DURATION,
        )
        ?: 0L

    val artwork =
      metadata
        ?.getBitmap(
          MediaMetadata.METADATA_KEY_ART,
        )
        ?: metadata
          ?.getBitmap(
            MediaMetadata.METADATA_KEY_ALBUM_ART,
          )

    return Arguments
      .createMap()
      .apply {
        putString(
          "title",
          title,
        )

        putString(
          "artist",
          artist,
        )

        putDouble(
          "durationMs",
          duration.toDouble(),
        )

        putDouble(
          "positionMs",
          (
            state?.position
              ?: 0L
          ).toDouble(),
        )

        putBoolean(
          "isPlaying",
          state?.state ==
            android.media.session.PlaybackState.STATE_PLAYING,
        )

        putString(
          "artworkUrl",
          artwork
            ?.let {
              bitmapDataUri(
                it,
              )
            }
            ?: "",
        )
      }
  }

  private fun bitmapDataUri(
    bitmap: Bitmap,
  ): String {
    val output =
      ByteArrayOutputStream()

    bitmap.compress(
      Bitmap.CompressFormat.JPEG,
      82,
      output,
    )

    return "data:image/jpeg;base64," +
      Base64.encodeToString(
        output.toByteArray(),
        Base64.NO_WRAP,
      )
  }
}
