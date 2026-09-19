package ai.meyra.app.ui.components

import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BugReport
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.Feedback
import androidx.compose.material.icons.filled.Lightbulb
import androidx.compose.material.icons.filled.ReportProblem
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
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
import androidx.compose.ui.window.DialogProperties
import ai.meyra.app.config.AppConfig
import ai.meyra.app.data.api.NetworkResult
import ai.meyra.app.data.model.FeedbackRequest
import ai.meyra.app.data.model.UserProfile
import ai.meyra.app.data.repository.ChatRepository
import ai.meyra.app.ui.theme.MeyraBorder
import ai.meyra.app.ui.theme.MeyraCard
import ai.meyra.app.ui.theme.MeyraPrimary
import ai.meyra.app.ui.theme.MeyraSurface
import ai.meyra.app.ui.theme.MeyraTextMuted
import ai.meyra.app.ui.theme.MeyraTextPrimary
import ai.meyra.app.ui.theme.MeyraTextSecondary
import kotlinx.coroutines.launch

enum class ReportCategory(val label: String) {
    FEEDBACK("Feedback"),
    BUG_REPORT("Bug Report"),
    PROBLEM("Problem"),
    SUGGESTION("Suggestion")
}

@Composable
fun FeedbackDialog(
    userProfile: UserProfile?,
    chatRepository: ChatRepository,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()

    var selectedCategory by remember { mutableStateOf(ReportCategory.FEEDBACK) }
    var feedbackText by remember { mutableStateOf("") }
    var isSubmitting by remember { mutableStateOf(false) }
    var submissionSuccess by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    val userEmail = userProfile?.email ?: "user@meyra.ai"
    val userName = userProfile?.name ?: "MEYRA User"
    val userId = userProfile?.id ?: "anonymous"

    Dialog(
        onDismissRequest = { if (!isSubmitting) onDismiss() },
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth(0.92f)
                .clip(RoundedCornerShape(20.dp))
                .border(1.dp, MeyraBorder, RoundedCornerShape(20.dp)),
            color = MeyraCard
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp)
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Feedback,
                            contentDescription = null,
                            tint = MeyraPrimary,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Text(
                            text = "Feedback & Report",
                            color = MeyraTextPrimary,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    IconButton(
                        onClick = onDismiss,
                        enabled = !isSubmitting,
                        modifier = Modifier.size(28.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "Close",
                            tint = MeyraTextMuted,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                if (submissionSuccess) {
                    // Success View
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = null,
                            tint = Color(0xFF10B981),
                            modifier = Modifier.size(56.dp)
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        Text(
                            text = "Thank You for Your Feedback!",
                            color = MeyraTextPrimary,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
                            textAlign = TextAlign.Center
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        Text(
                            text = "Your submission has been sent to himanshu22maurya22@gmail.com. We appreciate your help in making MEYRA AI better.",
                            color = MeyraTextSecondary,
                            fontSize = 13.sp,
                            textAlign = TextAlign.Center,
                            lineHeight = 18.sp
                        )

                        Spacer(modifier = Modifier.height(24.dp))

                        Button(
                            onClick = onDismiss,
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(containerColor = MeyraPrimary),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text("Done", fontWeight = FontWeight.SemiBold)
                        }
                    }
                } else {
                    // Feedback Form
                    Text(
                        text = "Select Category:",
                        color = MeyraTextSecondary,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    // 4 Categories Grid
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        ReportCategory.values().take(2).forEach { category ->
                            val isSelected = selectedCategory == category
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(if (isSelected) MeyraPrimary.copy(alpha = 0.2f) else MeyraSurface)
                                    .border(
                                        1.dp,
                                        if (isSelected) MeyraPrimary else MeyraBorder,
                                        RoundedCornerShape(10.dp)
                                    )
                                    .clickable { selectedCategory = category }
                                    .padding(vertical = 10.dp, horizontal = 8.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = category.label,
                                    color = if (isSelected) MeyraPrimary else MeyraTextSecondary,
                                    fontSize = 12.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        ReportCategory.values().drop(2).forEach { category ->
                            val isSelected = selectedCategory == category
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(if (isSelected) MeyraPrimary.copy(alpha = 0.2f) else MeyraSurface)
                                    .border(
                                        1.dp,
                                        if (isSelected) MeyraPrimary else MeyraBorder,
                                        RoundedCornerShape(10.dp)
                                    )
                                    .clickable { selectedCategory = category }
                                    .padding(vertical = 10.dp, horizontal = 8.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = category.label,
                                    color = if (isSelected) MeyraPrimary else MeyraTextSecondary,
                                    fontSize = 12.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    OutlinedTextField(
                        value = feedbackText,
                        onValueChange = { feedbackText = it },
                        placeholder = {
                            Text(
                                when (selectedCategory) {
                                    ReportCategory.FEEDBACK -> "Tell us about your experience with MEYRA AI..."
                                    ReportCategory.BUG_REPORT -> "Describe the bug, steps to reproduce, and what happened..."
                                    ReportCategory.PROBLEM -> "What problem or issue did you encounter?..."
                                    ReportCategory.SUGGESTION -> "What new feature or improvement would you like to see?..."
                                },
                                fontSize = 13.sp,
                                color = MeyraTextMuted
                            )
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(130.dp),
                        maxLines = 6,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = MeyraPrimary,
                            unfocusedBorderColor = MeyraBorder,
                            focusedContainerColor = MeyraSurface,
                            unfocusedContainerColor = MeyraSurface,
                            focusedTextColor = MeyraTextPrimary,
                            unfocusedTextColor = MeyraTextPrimary
                        ),
                        shape = RoundedCornerShape(12.dp)
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    // Meta Information Notice
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        color = MeyraSurface,
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Column(modifier = Modifier.padding(10.dp)) {
                            Text(
                                text = "Recipient: ${AppConfig.FEEDBACK_TARGET_EMAIL}",
                                color = MeyraTextMuted,
                                fontSize = 11.sp
                            )
                            Text(
                                text = "Sender: $userName ($userEmail) • App v${AppConfig.APP_VERSION}",
                                color = MeyraTextMuted,
                                fontSize = 11.sp
                            )
                        }
                    }

                    // Error Message
                    AnimatedVisibility(visible = errorMessage != null) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 10.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.ErrorOutline,
                                contentDescription = null,
                                tint = Color(0xFFEF4444),
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = errorMessage ?: "",
                                color = Color(0xFFEF4444),
                                fontSize = 12.sp
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Action Buttons
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        // Email Client Direct Send Fallback
                        OutlinedButton(
                            onClick = {
                                try {
                                    val subject = Uri.encode("[MEYRA AI ${selectedCategory.label.uppercase()}] from $userName")
                                    val body = Uri.encode(
                                        """
                                        Category: ${selectedCategory.label}
                                        From: $userName ($userEmail)
                                        User ID: $userId
                                        App Version: ${AppConfig.APP_VERSION}
                                        Android OS: ${Build.VERSION.RELEASE} (SDK ${Build.VERSION.SDK_INT})
                                        Device: ${Build.MANUFACTURER} ${Build.MODEL}
                                        Timestamp: ${System.currentTimeMillis()}

                                        Message:
                                        ${feedbackText.ifBlank { "(No message provided)" }}
                                        """.trimIndent()
                                    )
                                    val intent = Intent(Intent.ACTION_SENDTO).apply {
                                        data = Uri.parse("mailto:${AppConfig.FEEDBACK_TARGET_EMAIL}?subject=$subject&body=$body")
                                    }
                                    context.startActivity(intent)
                                } catch (e: Exception) {
                                    errorMessage = "Could not launch email app: ${e.localizedMessage}"
                                }
                            },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Icon(Icons.Default.Email, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Email App", fontSize = 12.sp)
                        }

                        // Direct Backend Submit
                        Button(
                            onClick = {
                                if (feedbackText.trim().isBlank()) {
                                    errorMessage = "Please enter a message before submitting."
                                    return@Button
                                }
                                errorMessage = null
                                isSubmitting = true

                                coroutineScope.launch {
                                    val request = FeedbackRequest(
                                        type = selectedCategory.label,
                                        message = feedbackText.trim(),
                                        userEmail = userEmail,
                                        userName = userName,
                                        userId = userId,
                                        targetEmail = AppConfig.FEEDBACK_TARGET_EMAIL,
                                        appVersion = AppConfig.APP_VERSION,
                                        platform = "Android"
                                    )

                                    val result = chatRepository.sendFeedback(request)
                                    isSubmitting = false
                                    when (result) {
                                        is NetworkResult.Success -> {
                                            submissionSuccess = true
                                        }
                                        is NetworkResult.Error -> {
                                            // Provide helpful retry and direct email option
                                            errorMessage = "${result.message}. You can also use the 'Email App' button."
                                        }
                                        else -> {}
                                    }
                                }
                            },
                            enabled = !isSubmitting,
                            modifier = Modifier.weight(1.3f),
                            colors = ButtonDefaults.buttonColors(containerColor = MeyraPrimary),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            if (isSubmitting) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(18.dp),
                                    color = Color.White,
                                    strokeWidth = 2.dp
                                )
                            } else {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.Send, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("Submit", fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
