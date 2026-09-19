package ai.meyra.app.ui.components

import android.content.Intent
import android.net.Uri
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.OpenInNew
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import ai.meyra.app.R
import ai.meyra.app.config.AppConfig
import ai.meyra.app.ui.theme.MeyraBorder
import ai.meyra.app.ui.theme.MeyraCard
import ai.meyra.app.ui.theme.MeyraPrimary
import ai.meyra.app.ui.theme.MeyraSecondary
import ai.meyra.app.ui.theme.MeyraSurface
import ai.meyra.app.ui.theme.MeyraTextMuted
import ai.meyra.app.ui.theme.MeyraTextPrimary
import ai.meyra.app.ui.theme.MeyraTextSecondary

@Composable
fun AboutDialog(
    onDismiss: () -> Unit
) {
    val context = LocalContext.current

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth(0.9f)
                .clip(RoundedCornerShape(24.dp))
                .border(1.dp, MeyraBorder, RoundedCornerShape(24.dp)),
            color = MeyraCard
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Header with Close Button
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Info,
                            contentDescription = null,
                            tint = MeyraPrimary,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "About MEYRA AI",
                            color = MeyraTextPrimary,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    IconButton(
                        onClick = onDismiss,
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

                Spacer(modifier = Modifier.height(20.dp))

                // MEYRA AI Logo
                Box(
                    modifier = Modifier
                        .size(72.dp)
                        .clip(RoundedCornerShape(20.dp))
                        .background(
                            Brush.radialGradient(
                                colors = listOf(
                                    MeyraPrimary.copy(alpha = 0.35f),
                                    Color(0xFF0F0F18)
                                )
                            )
                        )
                        .border(1.dp, MeyraPrimary.copy(alpha = 0.5f), RoundedCornerShape(20.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        painter = painterResource(id = R.drawable.ic_meyra_logo),
                        contentDescription = "MEYRA AI Logo",
                        tint = Color.Unspecified,
                        modifier = Modifier.size(42.dp)
                    )
                }

                Spacer(modifier = Modifier.height(14.dp))

                Text(
                    text = "MEYRA AI",
                    color = MeyraTextPrimary,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.ExtraBold,
                    letterSpacing = 1.sp
                )

                Text(
                    text = "Version ${AppConfig.APP_VERSION}",
                    color = MeyraTextMuted,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Normal
                )

                Spacer(modifier = Modifier.height(20.dp))

                // Creator & Founder Card
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = MeyraSurface,
                    shape = RoundedCornerShape(16.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, MeyraBorder)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(CircleShape)
                                .background(MeyraPrimary.copy(alpha = 0.15f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Person,
                                contentDescription = null,
                                tint = MeyraPrimary,
                                modifier = Modifier.size(20.dp)
                            )
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        Text(
                            text = "Created & Developed by Himanshu Maurya",
                            color = MeyraTextPrimary,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            textAlign = TextAlign.Center
                        )

                        Spacer(modifier = Modifier.height(4.dp))

                        Text(
                            text = "Founder & Lead Developer",
                            color = MeyraTextMuted,
                            fontSize = 12.sp,
                            textAlign = TextAlign.Center
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        // Instagram Button / Link
                        Row(
                            modifier = Modifier
                                .clip(RoundedCornerShape(10.dp))
                                .background(Color(0xFFE1306C).copy(alpha = 0.12f))
                                .border(1.dp, Color(0xFFE1306C).copy(alpha = 0.35f), RoundedCornerShape(10.dp))
                                .clickable {
                                    val intent = Intent(
                                        Intent.ACTION_VIEW,
                                        Uri.parse(AppConfig.CREATOR_INSTAGRAM_URL)
                                    )
                                    context.startActivity(intent)
                                }
                                .padding(horizontal = 14.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.Center
                        ) {
                            Text(
                                text = "Instagram: ${AppConfig.CREATOR_INSTAGRAM_HANDLE}",
                                color = Color(0xFFF472B6),
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Icon(
                                imageVector = Icons.Default.OpenInNew,
                                contentDescription = null,
                                tint = Color(0xFFF472B6),
                                modifier = Modifier.size(14.dp)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Technical & Architectural Notice
                Text(
                    text = "MEYRA AI is an independent, next-generation AI assistant. Cloud intelligence infrastructure and model routing powered by secure server-side Google Cloud and Gemini services.",
                    color = MeyraTextMuted,
                    fontSize = 11.sp,
                    textAlign = TextAlign.Center,
                    lineHeight = 16.sp,
                    modifier = Modifier.padding(horizontal = 8.dp)
                )

                Spacer(modifier = Modifier.height(20.dp))

                Button(
                    onClick = onDismiss,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = MeyraPrimary),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("Close", fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}
