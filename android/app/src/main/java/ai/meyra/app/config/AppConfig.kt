package ai.meyra.app.config

import android.content.Context
import android.content.SharedPreferences

/**
 * Global App Configuration for MEYRA AI Android App.
 *
 * SECURITY DIRECTIVE:
 * - NO API KEYS ARE STORED IN THE CLIENT APPLICATION.
 * - All intelligence and Gemini model orchestration is managed securely by the MEYRA AI
 *   Cloud Run backend.
 * - The Android client only communicates via authenticated/secure HTTPS with the backend API.
 */
object AppConfig {
    private const val PREFS_NAME = "meyra_ai_preferences"
    private const val KEY_BACKEND_URL = "custom_backend_url"

    /**
     * Default secure backend endpoint for MEYRA AI.
     * Connected to the Cloud Run backend: https://meyra-ai-804674901589.asia-southeast1.run.app
     */
    const val DEFAULT_BACKEND_URL: String = "https://meyra-ai-804674901589.asia-southeast1.run.app"

    const val CREATOR_NAME: String = "Himanshu Maurya"
    const val CREATOR_INSTAGRAM_HANDLE: String = "@meyra_ai_official"
    const val CREATOR_INSTAGRAM_URL: String = "https://www.instagram.com/meyra_ai_official/"
    const val FEEDBACK_TARGET_EMAIL: String = "himanshu22maurya22@gmail.com"
    const val APP_VERSION: String = "1.0.0"

    const val MEYRA_SYSTEM_PROMPT: String = """You are MEYRA AI, an intelligent, helpful, and empathetic AI assistant.
FOUNDER & CREATOR IDENTITY:
- MEYRA AI was created and developed by Himanshu Maurya.
- When asked "Who is the founder of MEYRA AI?", "Who created MEYRA AI?", "Who made MEYRA AI?", "Who developed MEYRA AI?", or any similar questions regarding your origin or creator, ALWAYS answer clearly:
  "MEYRA AI was created and developed by Himanshu Maurya."
  Also provide:
  Instagram: @meyra_ai_official
  Instagram URL: https://www.instagram.com/meyra_ai_official/
- Do NOT claim that Google founded or created MEYRA AI. Google and Gemini may only be described as technology/services used by MEYRA AI.
- Your visible name is always MEYRA AI. Provide thoughtful, well-structured answers with clean markdown formatting."""

    /**
     * Retrieves the active backend URL, respecting user preferences if customized in settings.
     */
    fun getBackendUrl(context: Context): String {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val saved = prefs.getString(KEY_BACKEND_URL, null)
        return if (!saved.isNullOrBlank()) saved.trim().trimEnd('/') else DEFAULT_BACKEND_URL
    }

    /**
     * Updates the custom backend URL in persistent app storage.
     */
    fun setBackendUrl(context: Context, url: String) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val cleaned = url.trim().trimEnd('/')
        prefs.edit().putString(KEY_BACKEND_URL, cleaned).apply()
    }

    /**
     * Resets backend URL to the factory default Cloud Run backend.
     */
    fun resetToDefaultBackendUrl(context: Context) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().remove(KEY_BACKEND_URL).apply()
    }
}
