package ai.meyra.app.ui.components

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ai.meyra.app.R
import ai.meyra.app.data.model.ChatMessage
import ai.meyra.app.data.model.MessageRole
import ai.meyra.app.ui.theme.AiBubbleBackground
import ai.meyra.app.ui.theme.MeyraAccentEmerald
import ai.meyra.app.ui.theme.MeyraBorder
import ai.meyra.app.ui.theme.MeyraCard
import ai.meyra.app.ui.theme.MeyraError
import ai.meyra.app.ui.theme.MeyraErrorBackground
import ai.meyra.app.ui.theme.MeyraPrimary
import ai.meyra.app.ui.theme.MeyraPrimaryLight
import ai.meyra.app.ui.theme.MeyraPrimaryVariant
import ai.meyra.app.ui.theme.MeyraSurface
import ai.meyra.app.ui.theme.MeyraTextMuted
import ai.meyra.app.ui.theme.MeyraTextPrimary
import ai.meyra.app.ui.theme.MeyraTextSecondary

@Composable
fun MessageBubble(
    message: ChatMessage,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier
) {
    val isUser = message.role == MessageRole.user
    val context = LocalContext.current
    var isCopied by remember { mutableStateOf(false) }

    Box(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 14.dp, vertical = 6.dp),
        contentAlignment = if (isUser) Alignment.CenterEnd else Alignment.CenterStart
    ) {
        if (isUser) {
            // USER MESSAGE — ALIGNED TO THE RIGHT
            Column(
                horizontalAlignment = Alignment.End,
                modifier = Modifier.fillMaxWidth(0.85f)
            ) {
                Box(
                    modifier = Modifier
                        .clip(
                            RoundedCornerShape(
                                topStart = 18.dp,
                                topEnd = 18.dp,
                                bottomStart = 18.dp,
                                bottomEnd = 4.dp
                            )
                        )
                        .background(
                            Brush.linearGradient(
                                listOf(MeyraPrimary, MeyraPrimaryVariant)
                            )
                        )
                        .border(
                            1.dp,
                            MeyraPrimaryLight.copy(alpha = 0.3f),
                            RoundedCornerShape(
                                topStart = 18.dp,
                                topEnd = 18.dp,
                                bottomStart = 18.dp,
                                bottomEnd = 4.dp
                            )
                        )
                        .padding(horizontal = 16.dp, vertical = 12.dp)
                ) {
                    Text(
                        text = message.content,
                        style = MaterialTheme.typography.bodyLarge,
                        color = Color.White,
                        fontSize = 15.sp,
                        lineHeight = 22.sp
                    )
                }
            }
        } else {
            // MEYRA AI ASSISTANT MESSAGE — ALIGNED TO THE LEFT
            Column(
                horizontalAlignment = Alignment.Start,
                modifier = Modifier.fillMaxWidth(0.92f)
            ) {
                // Assistant Identification Header
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 6.dp, start = 2.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        // Official MEYRA AI Emblem Badge
                        Box(
                            modifier = Modifier
                                .size(24.dp)
                                .clip(RoundedCornerShape(6.dp))
                                .background(MeyraSurface)
                                .border(1.dp, MeyraPrimary.copy(alpha = 0.4f), RoundedCornerShape(6.dp)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                painter = painterResource(id = R.drawable.ic_meyra_logo),
                                contentDescription = "MEYRA AI Emblem",
                                tint = Color.Unspecified,
                                modifier = Modifier.size(15.dp)
                            )
                        }

                        // Assistant Name: Strictly "MEYRA AI"
                        Text(
                            text = "MEYRA AI",
                            color = MeyraTextPrimary,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 0.5.sp
                        )

                        if (message.isStreaming) {
                            Box(
                                modifier = Modifier
                                    .size(6.dp)
                                    .clip(CircleShape)
                                    .background(MeyraPrimaryLight)
                            )
                        }
                    }

                    // Copy Action
                    if (!message.isError && message.content.isNotBlank()) {
                        IconButton(
                            onClick = {
                                val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                clipboard.setPrimaryClip(ClipData.newPlainText("MEYRA AI", message.content))
                                isCopied = true
                                Toast.makeText(context, "Copied response to clipboard", Toast.LENGTH_SHORT).show()
                            },
                            modifier = Modifier.size(26.dp)
                        ) {
                            Icon(
                                imageVector = if (isCopied) Icons.Default.Check else Icons.Default.ContentCopy,
                                contentDescription = "Copy message",
                                tint = if (isCopied) MeyraAccentEmerald else MeyraTextMuted,
                                modifier = Modifier.size(14.dp)
                            )
                        }
                    }
                }

                // Message Body Card
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(
                        topStart = 4.dp,
                        topEnd = 18.dp,
                        bottomStart = 18.dp,
                        bottomEnd = 18.dp
                    ),
                    color = if (message.isError) MeyraErrorBackground else MeyraCard,
                    border = androidx.compose.foundation.BorderStroke(
                        1.dp,
                        if (message.isError) MeyraError.copy(alpha = 0.5f) else MeyraBorder
                    )
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        if (message.isError) {
                            Row(verticalAlignment = Alignment.Top) {
                                Icon(
                                    imageVector = Icons.Default.ErrorOutline,
                                    contentDescription = "Error",
                                    tint = MeyraError,
                                    modifier = Modifier.size(18.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = message.content,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = Color(0xFFFCA5A5),
                                    fontSize = 14.sp
                                )
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            Button(
                                onClick = onRetry,
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = MeyraError.copy(alpha = 0.25f),
                                    contentColor = Color(0xFFFCA5A5)
                                ),
                                shape = RoundedCornerShape(8.dp),
                                contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp),
                                modifier = Modifier.height(34.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Refresh,
                                    contentDescription = "Retry",
                                    modifier = Modifier.size(14.dp)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Retry", fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                            }
                        } else {
                            // Rich Markdown Formatting
                            FormattedText(
                                text = message.content,
                                textColor = MeyraTextPrimary
                            )
                        }
                    }
                }
            }
        }
    }
}
