package ai.meyra.app.ui.components

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.core.content.ContextCompat
import ai.meyra.app.ui.theme.*

enum class SpeechLanguage(val code: String, val displayName: String) {
    EN_IN("en-IN", "English (India)"),
    HI_IN("hi-IN", "Hindi (भारत)")
}

@Composable
fun VoiceInputDialog(
    onDismiss: () -> Unit,
    onTranscriptionComplete: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    var isListening by remember { mutableStateOf(false) }
    var selectedLanguage by remember { mutableStateOf(SpeechLanguage.EN_IN) }
    var partialText by remember { mutableStateOf("") }
    var finalText by remember { mutableStateOf("") }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var speechRecognizer by remember { mutableStateOf<SpeechRecognizer?>(null) }

    // Clean up SpeechRecognizer when dialog closes
    DisposableEffect(Unit) {
        onDispose {
            speechRecognizer?.let {
                try {
                    it.stopListening()
                    it.cancel()
                    it.destroy()
                } catch (e: Exception) {
                    // Ignore cleanup exceptions
                }
            }
        }
    }

    // Safely start speech recognition with selected language
    fun startRecognition(lang: SpeechLanguage) {
        errorMessage = null
        partialText = ""

        if (!SpeechRecognizer.isRecognitionAvailable(context)) {
            errorMessage = "Speech recognition service is not available on this device."
            isListening = false
            return
        }

        try {
            speechRecognizer?.destroy()
            val recognizer = SpeechRecognizer.createSpeechRecognizer(context)
            speechRecognizer = recognizer

            recognizer.setRecognitionListener(object : RecognitionListener {
                override fun onReadyForSpeech(params: Bundle?) {
                    isListening = true
                    errorMessage = null
                }

                override fun onBeginningOfSpeech() {
                    // Audio stream is receiving sound
                }

                override fun onRmsChanged(rmsdB: Float) {
                    // Audio level updates
                }

                override fun onBufferReceived(buffer: ByteArray?) {
                    // Raw microphone audio buffer is intentionally discarded.
                    // Raw recordings are never stored.
                }

                override fun onEndOfSpeech() {
                    isListening = false
                }

                override fun onError(error: Int) {
                    isListening = false
                    val msg = when (error) {
                        SpeechRecognizer.ERROR_AUDIO -> "Audio recording error. Please check your microphone."
                        SpeechRecognizer.ERROR_CLIENT -> "Client error occurred."
                        SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Microphone permission is required."
                        SpeechRecognizer.ERROR_NETWORK -> "Network error. Please verify your connection."
                        SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "Network timed out."
                        SpeechRecognizer.ERROR_NO_MATCH -> "No speech detected. Please try speaking again."
                        SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "Recognition service is currently busy. Try again."
                        SpeechRecognizer.ERROR_SERVER -> "Server error occurred."
                        SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "No speech detected."
                        else -> "Speech recognition error ($error). Please try again."
                    }
                    errorMessage = msg
                }

                override fun onResults(results: Bundle?) {
                    isListening = false
                    val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                    if (!matches.isNullOrEmpty()) {
                        val text = matches[0]
                        finalText = text
                        partialText = text
                    }
                }

                override fun onPartialResults(partialResults: Bundle?) {
                    val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                    if (!matches.isNullOrEmpty()) {
                        partialText = matches[0]
                    }
                }

                override fun onEvent(eventType: Int, params: Bundle?) {}
            })

            val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE, lang.code)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, lang.code)
                putExtra(RecognizerIntent.EXTRA_ONLY_RETURN_LANGUAGE_PREFERENCE, lang.code)
                putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
            }

            recognizer.startListening(intent)
            isListening = true
        } catch (e: Exception) {
            errorMessage = "Failed to initialize speech recognition: ${e.message}"
            isListening = false
        }
    }

    // Stop speech recognition safely
    fun stopRecognition() {
        try {
            speechRecognizer?.stopListening()
        } catch (e: Exception) {
            // Ignore
        }
        isListening = false
    }

    // Permission launcher for RECORD_AUDIO
    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            startRecognition(selectedLanguage)
        } else {
            errorMessage = "Microphone permission is required for voice input."
        }
    }

    fun handleStartClick() {
        val hasPermission = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED

        if (hasPermission) {
            startRecognition(selectedLanguage)
        } else {
            permissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
        }
    }

    Dialog(onDismissRequest = {
        stopRecognition()
        onDismiss()
    }) {
        Surface(
            modifier = modifier
                .fillMaxWidth()
                .wrapContentHeight(),
            shape = RoundedCornerShape(28.dp),
            color = MeyraSurface,
            border = androidx.compose.foundation.BorderStroke(1.dp, MeyraBorder)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Header with Close
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Voice Mode",
                        style = MaterialTheme.typography.titleMedium,
                        color = TextPrimary,
                        fontWeight = FontWeight.SemiBold
                    )
                    IconButton(onClick = {
                        stopRecognition()
                        onDismiss()
                    }) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "Close",
                            tint = TextMuted
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Language Selection: English (India) vs Hindi (India)
                Row(
                    modifier = Modifier
                        .clip(RoundedCornerShape(20.dp))
                        .background(MeyraBackground)
                        .padding(4.dp),
                    horizontalArrangement = Arrangement.Center
                ) {
                    SpeechLanguage.values().forEach { lang ->
                        val isSelected = selectedLanguage == lang
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(16.dp))
                                .background(if (isSelected) MeyraPrimary else Color.Transparent)
                                .clickable {
                                    if (selectedLanguage != lang) {
                                        selectedLanguage = lang
                                        if (isListening) {
                                            stopRecognition()
                                            startRecognition(lang)
                                        }
                                    }
                                }
                                .padding(horizontal = 14.dp, vertical = 6.dp)
                        ) {
                            Text(
                                text = lang.displayName,
                                style = MaterialTheme.typography.labelSmall,
                                color = if (isSelected) TextPrimary else TextMuted,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // State Badge
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(16.dp))
                        .background(if (isListening) Color(0x33E11D48) else Color(0x1AFFFFFF))
                        .border(
                            1.dp,
                            if (isListening) Color(0x66E11D48) else Color(0x33FFFFFF),
                            RoundedCornerShape(16.dp)
                        )
                        .padding(horizontal = 16.dp, vertical = 6.dp)
                ) {
                    Text(
                        text = if (isListening) "LISTENING..." else "VOICE MODE READY",
                        style = MaterialTheme.typography.labelSmall,
                        color = if (isListening) Color(0xFFFDA4AF) else TextMuted,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp
                    )
                }

                Spacer(modifier = Modifier.height(20.dp))

                // Large Microphone / Audio Orb Indicator
                Box(
                    modifier = Modifier
                        .size(96.dp)
                        .clip(CircleShape)
                        .background(
                            if (isListening) MeyraPrimary else MeyraSurfaceHighlight
                        )
                        .clickable {
                            if (isListening) {
                                stopRecognition()
                            } else {
                                handleStartClick()
                            }
                        },
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = if (isListening) Icons.Default.Stop else Icons.Default.Mic,
                        contentDescription = if (isListening) "Stop listening" else "Start speaking",
                        tint = TextPrimary,
                        modifier = Modifier.size(44.dp)
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Error Message if any
                errorMessage?.let { err ->
                    Text(
                        text = err,
                        style = MaterialTheme.typography.bodySmall,
                        color = Color(0xFFF87171),
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(horizontal = 8.dp)
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                }

                // Transcription Preview Box (displays partial and final results)
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(min = 72.dp, max = 140.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .background(MeyraBackground)
                        .border(1.dp, MeyraBorder, RoundedCornerShape(16.dp))
                        .padding(14.dp),
                    contentAlignment = Alignment.CenterStart
                ) {
                    val display = if (partialText.isNotBlank()) partialText else finalText
                    if (display.isNotBlank()) {
                        Text(
                            text = display,
                            style = MaterialTheme.typography.bodyMedium,
                            color = TextPrimary
                        )
                    } else {
                        Text(
                            text = if (isListening) "Listening... Speak now" else "Tap microphone to speak",
                            style = MaterialTheme.typography.bodySmall,
                            color = TextMuted,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                // Action Controls: Start Speaking / Stop & Put into Chat
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    if (isListening) {
                        Button(
                            onClick = { stopRecognition() },
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFFE11D48)
                            ),
                            shape = RoundedCornerShape(16.dp)
                        ) {
                            Icon(Icons.Default.Stop, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Stop")
                        }
                    } else {
                        Button(
                            onClick = { handleStartClick() },
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = MeyraPrimary
                            ),
                            shape = RoundedCornerShape(16.dp)
                        ) {
                            Icon(Icons.Default.Mic, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Start Speaking")
                        }
                    }

                    // Put final text into chat input without auto-sending
                    val textToPut = if (finalText.isNotBlank()) finalText else partialText
                    if (textToPut.isNotBlank()) {
                        Button(
                            onClick = {
                                stopRecognition()
                                onTranscriptionComplete(textToPut.trim())
                                onDismiss()
                            },
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFF059669)
                            ),
                            shape = RoundedCornerShape(16.dp)
                        ) {
                            Text("Add to Chat")
                        }
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Speech is processed on device. Raw audio recordings are never stored.",
                    style = MaterialTheme.typography.labelSmall,
                    color = TextMuted.copy(alpha = 0.6f),
                    fontSize = 10.sp,
                    textAlign = TextAlign.Center
                )
            }
        }
    }
}
