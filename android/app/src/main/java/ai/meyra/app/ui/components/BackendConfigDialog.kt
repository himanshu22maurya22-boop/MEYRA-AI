package ai.meyra.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CloudDone
import androidx.compose.material.icons.filled.Dns
import androidx.compose.material.icons.filled.Info
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import ai.meyra.app.config.AppConfig
import ai.meyra.app.data.model.ApiStatusResponse
import ai.meyra.app.ui.theme.*

@Composable
fun BackendConfigDialog(
    currentUrl: String,
    apiStatus: ApiStatusResponse?,
    onSave: (String) -> Unit,
    onReset: () -> Unit,
    onDismiss: () -> Unit
) {
    var editedUrl by remember { mutableStateOf(currentUrl) }

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(20.dp))
                .border(1.dp, MeyraBorder, RoundedCornerShape(20.dp)),
            color = MeyraSurface
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(MeyraPrimary.copy(alpha = 0.15f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Dns,
                            contentDescription = null,
                            tint = MeyraPrimaryLight,
                            modifier = Modifier.size(20.dp)
                        )
                    }

                    Column {
                        Text(
                            text = "MEYRA AI Backend",
                            style = MaterialTheme.typography.titleMedium,
                            color = TextPrimary,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Secure Cloud Run or Local Service",
                            style = MaterialTheme.typography.bodySmall,
                            color = TextMuted
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Backend Health Indicator
                if (apiStatus != null) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(10.dp))
                            .background(MeyraAccentEmerald.copy(alpha = 0.12f))
                            .padding(10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.CloudDone,
                            contentDescription = "Connected",
                            tint = MeyraAccentEmerald,
                            modifier = Modifier.size(16.dp)
                        )
                        Text(
                            text = "Backend Online • ${apiStatus.model ?: "Gemini Active"}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MeyraAccentEmerald,
                            fontWeight = FontWeight.Medium
                        )
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                }

                Text(
                    text = "Backend Base URL",
                    style = MaterialTheme.typography.labelSmall,
                    color = TextSecondary
                )

                Spacer(modifier = Modifier.height(6.dp))

                OutlinedTextField(
                    value = editedUrl,
                    onValueChange = { editedUrl = it },
                    modifier = Modifier.fillMaxWidth(),
                    textStyle = MaterialTheme.typography.bodyMedium.copy(color = TextPrimary),
                    placeholder = {
                        Text("https://your-backend.run.app", color = TextMuted)
                    },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = MeyraPrimaryLight,
                        unfocusedBorderColor = MeyraBorder,
                        focusedContainerColor = MeyraSurfaceVariant,
                        unfocusedContainerColor = MeyraSurfaceVariant
                    ),
                    shape = RoundedCornerShape(12.dp),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(10.dp))

                // Security Note
                Row(
                    verticalAlignment = Alignment.Top,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Info,
                        contentDescription = null,
                        tint = MeyraPrimaryLight,
                        modifier = Modifier
                            .size(14.dp)
                            .padding(top = 2.dp)
                    )
                    Text(
                        text = "Your Gemini API keys remain safely guarded on the server. The Android app never stores secret keys.",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextMuted,
                        fontSize = 11.sp,
                        lineHeight = 15.sp
                    )
                }

                Spacer(modifier = Modifier.height(20.dp))

                // Actions
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    TextButton(
                        onClick = onReset,
                        colors = ButtonDefaults.textButtonColors(contentColor = TextSecondary)
                    ) {
                        Text("Reset Default", fontSize = 12.sp)
                    }

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        TextButton(
                            onClick = onDismiss,
                            colors = ButtonDefaults.textButtonColors(contentColor = TextMuted)
                        ) {
                            Text("Cancel")
                        }

                        Button(
                            onClick = { onSave(editedUrl) },
                            colors = ButtonDefaults.buttonColors(containerColor = MeyraPrimary),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text("Save")
                        }
                    }
                }
            }
        }
    }
}
