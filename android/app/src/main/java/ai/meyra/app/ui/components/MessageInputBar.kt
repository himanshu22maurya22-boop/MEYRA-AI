package ai.meyra.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ai.meyra.app.ui.theme.*

@Composable
fun MessageInputBar(
    value: String,
    onValueChange: (String) -> Unit,
    onSend: () -> Unit,
    isLoading: Boolean,
    onOpenVoiceInput: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    val canSend = value.isNotBlank() && !isLoading

    Surface(
        modifier = modifier.fillMaxWidth(),
        color = MeyraBackground,
        tonalElevation = 8.dp
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 10.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(24.dp))
                    .background(MeyraSurface)
                    .border(1.dp, MeyraBorder, RoundedCornerShape(24.dp))
                    .padding(horizontal = 14.dp, vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                TextField(
                    value = value,
                    onValueChange = onValueChange,
                    modifier = Modifier.weight(1f),
                    placeholder = {
                        Text(
                            text = if (isLoading) "MEYRA AI is generating..." else "Ask MEYRA AI anything...",
                            style = MaterialTheme.typography.bodyMedium,
                            color = TextMuted
                        )
                    },
                    colors = TextFieldDefaults.colors(
                        focusedContainerColor = Color.Transparent,
                        unfocusedContainerColor = Color.Transparent,
                        disabledContainerColor = Color.Transparent,
                        focusedIndicatorColor = Color.Transparent,
                        unfocusedIndicatorColor = Color.Transparent,
                        disabledIndicatorColor = Color.Transparent,
                        focusedTextColor = TextPrimary,
                        unfocusedTextColor = TextPrimary,
                        cursorColor = MeyraPrimaryLight
                    ),
                    maxLines = 5,
                    enabled = !isLoading,
                    keyboardOptions = KeyboardOptions(
                        capitalization = KeyboardCapitalization.Sentences,
                        imeAction = if (canSend) ImeAction.Send else ImeAction.Default
                    ),
                    keyboardActions = KeyboardActions(
                        onSend = {
                            if (canSend) {
                                onSend()
                            }
                        }
                    )
                )

                IconButton(
                    onClick = onOpenVoiceInput,
                    enabled = !isLoading,
                    modifier = Modifier
                        .size(38.dp)
                        .clip(CircleShape)
                        .background(MeyraSurfaceHighlight)
                ) {
                    Icon(
                        imageVector = Icons.Default.Mic,
                        contentDescription = "Voice input",
                        tint = MeyraPrimaryLight,
                        modifier = Modifier.size(18.dp)
                    )
                }

                Spacer(modifier = Modifier.width(6.dp))

                IconButton(
                    onClick = onSend,
                    enabled = canSend,
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(
                            if (canSend) MeyraPrimary else MeyraSurfaceHighlight
                        )
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.Send,
                        contentDescription = "Send message",
                        tint = if (canSend) TextPrimary else TextMuted,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "MEYRA AI communicates securely with your Cloud Run backend.",
                style = MaterialTheme.typography.labelSmall,
                color = TextMuted.copy(alpha = 0.6f),
                modifier = Modifier.align(Alignment.CenterHorizontally),
                fontSize = 10.sp
            )
        }
    }
}
