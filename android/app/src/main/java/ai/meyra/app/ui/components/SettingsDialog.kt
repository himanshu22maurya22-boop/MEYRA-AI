package ai.meyra.app.ui.components

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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Dns
import androidx.compose.material.icons.filled.ExitToApp
import androidx.compose.material.icons.filled.Feedback
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Divider
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import ai.meyra.app.data.model.ApiStatusResponse
import ai.meyra.app.data.model.UserProfile
import ai.meyra.app.ui.theme.MeyraBorder
import ai.meyra.app.ui.theme.MeyraCard
import ai.meyra.app.ui.theme.MeyraPrimary
import ai.meyra.app.ui.theme.MeyraSurface
import ai.meyra.app.ui.theme.MeyraTextMuted
import ai.meyra.app.ui.theme.MeyraTextPrimary
import ai.meyra.app.ui.theme.MeyraTextSecondary

@Composable
fun SettingsDialog(
    userProfile: UserProfile?,
    currentBackendUrl: String,
    apiStatus: ApiStatusResponse?,
    onSaveBackendUrl: (String) -> Unit,
    onResetBackendUrl: () -> Unit,
    onOpenFeedback: () -> Unit,
    onOpenAbout: () -> Unit,
    onLogout: () -> Unit,
    onDismiss: () -> Unit
) {
    var editedUrl by remember { mutableStateOf(currentBackendUrl) }
    var showBackendConfig by remember { mutableStateOf(false) }
    val scrollState = rememberScrollState()

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth(0.92f)
                .clip(RoundedCornerShape(22.dp))
                .border(1.dp, MeyraBorder, RoundedCornerShape(22.dp)),
            color = MeyraCard
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp)
                    .verticalScroll(scrollState)
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Settings,
                            contentDescription = null,
                            tint = MeyraPrimary,
                            modifier = Modifier.size(22.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Settings & Profile",
                            color = MeyraTextPrimary,
                            fontSize = 18.sp,
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

                Spacer(modifier = Modifier.height(18.dp))

                // User Profile Card
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = MeyraSurface,
                    shape = RoundedCornerShape(16.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, MeyraBorder)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // User Avatar
                        Box(
                            modifier = Modifier
                                .size(46.dp)
                                .clip(CircleShape)
                                .background(MeyraPrimary.copy(alpha = 0.2f))
                                .border(1.5.dp, MeyraPrimary, CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = userProfile?.name?.take(1)?.uppercase() ?: "M",
                                color = MeyraTextPrimary,
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }

                        Spacer(modifier = Modifier.width(12.dp))

                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = userProfile?.name ?: "MEYRA User",
                                color = MeyraTextPrimary,
                                fontSize = 15.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                            Text(
                                text = userProfile?.email ?: "Signed in with Google",
                                color = MeyraTextSecondary,
                                fontSize = 12.sp
                            )
                            Text(
                                text = "ID: ${userProfile?.id ?: "local_user"}",
                                color = MeyraTextMuted,
                                fontSize = 10.sp
                            )
                        }

                        // Logout Button
                        IconButton(
                            onClick = onLogout,
                            modifier = Modifier.size(36.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.ExitToApp,
                                contentDescription = "Sign Out",
                                tint = Color(0xFFEF4444),
                                modifier = Modifier.size(22.dp)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Options Section
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(14.dp))
                        .background(MeyraSurface)
                        .border(1.dp, MeyraBorder, RoundedCornerShape(14.dp))
                ) {
                    // Feedback & Report
                    SettingsOptionRow(
                        icon = Icons.Default.Feedback,
                        title = "Feedback & Report",
                        subtitle = "Send bug reports, feedback, or suggestions",
                        onClick = onOpenFeedback
                    )

                    HorizontalDivider(color = MeyraBorder, thickness = 0.8.dp)

                    // About MEYRA AI (Founder Info)
                    SettingsOptionRow(
                        icon = Icons.Default.Info,
                        title = "About MEYRA AI",
                        subtitle = "Created & Developed by Himanshu Maurya",
                        onClick = onOpenAbout
                    )

                    HorizontalDivider(color = MeyraBorder, thickness = 0.8.dp)

                    // Backend Configuration Toggle
                    SettingsOptionRow(
                        icon = Icons.Default.Dns,
                        title = "Cloud Run Backend",
                        subtitle = if (apiStatus?.isConfigured == true) "Connected & Online" else "Custom URL Settings",
                        onClick = { showBackendConfig = !showBackendConfig }
                    )
                }

                // Collapsible Backend Config Section
                if (showBackendConfig) {
                    Spacer(modifier = Modifier.height(14.dp))

                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        color = MeyraSurface,
                        shape = RoundedCornerShape(14.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, MeyraBorder)
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Text(
                                text = "Backend Service Endpoint",
                                color = MeyraTextPrimary,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                            Spacer(modifier = Modifier.height(6.dp))

                            OutlinedTextField(
                                value = editedUrl,
                                onValueChange = { editedUrl = it },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = MeyraPrimary,
                                    unfocusedBorderColor = MeyraBorder,
                                    focusedContainerColor = MeyraCard,
                                    unfocusedContainerColor = MeyraCard,
                                    focusedTextColor = MeyraTextPrimary,
                                    unfocusedTextColor = MeyraTextPrimary
                                ),
                                shape = RoundedCornerShape(10.dp)
                            )

                            Spacer(modifier = Modifier.height(10.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                TextButton(onClick = {
                                    onResetBackendUrl()
                                    editedUrl = currentBackendUrl
                                }) {
                                    Text("Reset Default", color = MeyraTextMuted, fontSize = 12.sp)
                                }

                                Button(
                                    onClick = { onSaveBackendUrl(editedUrl) },
                                    colors = ButtonDefaults.buttonColors(containerColor = MeyraPrimary),
                                    shape = RoundedCornerShape(8.dp)
                                ) {
                                    Text("Save URL", fontSize = 12.sp)
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                // Logout Action Banner
                Button(
                    onClick = onLogout,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(46.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0xFFEF4444).copy(alpha = 0.15f),
                        contentColor = Color(0xFFF87171)
                    ),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.ExitToApp,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Sign Out (${userProfile?.email ?: "Account"})",
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 13.sp
                    )
                }
            }
        }
    }
}

@Composable
private fun SettingsOptionRow(
    icon: ImageVector,
    title: String,
    subtitle: String,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(34.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(MeyraPrimary.copy(alpha = 0.12f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = MeyraPrimary,
                modifier = Modifier.size(18.dp)
            )
        }

        Spacer(modifier = Modifier.width(12.dp))

        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                color = MeyraTextPrimary,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                text = subtitle,
                color = MeyraTextMuted,
                fontSize = 11.sp
            )
        }

        Icon(
            imageVector = Icons.Default.ChevronRight,
            contentDescription = null,
            tint = MeyraTextMuted,
            modifier = Modifier.size(18.dp)
        )
    }
}
