package ai.meyra.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ai.meyra.app.R
import ai.meyra.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MeyraTopBar(
    onNewChat: () -> Unit,
    onOpenSettings: () -> Unit,
    hasMessages: Boolean,
    modifier: Modifier = Modifier
) {
    TopAppBar(
        title = {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(MeyraSurface)
                        .border(1.dp, MeyraBorder, RoundedCornerShape(10.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        painter = painterResource(id = R.drawable.ic_meyra_logo),
                        contentDescription = "MEYRA Logo",
                        tint = androidx.compose.ui.graphics.Color.Unspecified,
                        modifier = Modifier.size(20.dp)
                    )
                }

                Column {
                    Text(
                        text = "MEYRA AI",
                        style = MaterialTheme.typography.titleLarge,
                        color = TextPrimary
                    )
                    Text(
                        text = "Intelligent Assistant",
                        style = MaterialTheme.typography.labelSmall,
                        color = MeyraPrimaryLight,
                        fontSize = 10.sp
                    )
                }
            }
        },
        actions = {
            if (hasMessages) {
                // New Conversation Button with Label
                Button(
                    onClick = onNewChat,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MeyraSurfaceHighlight,
                        contentColor = TextPrimary
                    ),
                    shape = RoundedCornerShape(10.dp),
                    border = ButtonDefaults.outlinedButtonBorder.copy(
                        brush = androidx.compose.ui.graphics.SolidColor(MeyraBorder)
                    ),
                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                    modifier = Modifier.height(34.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Add,
                        contentDescription = "New Conversation",
                        tint = MeyraPrimaryLight,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "New Chat",
                        style = MaterialTheme.typography.labelSmall,
                        color = TextPrimary
                    )
                }
            }

            IconButton(
                onClick = onOpenSettings,
                modifier = Modifier
                    .padding(horizontal = 4.dp)
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(MeyraSurface)
            ) {
                Icon(
                    imageVector = Icons.Default.Settings,
                    contentDescription = "Backend Settings",
                    tint = TextSecondary,
                    modifier = Modifier.size(18.dp)
                )
            }
        },
        colors = TopAppBarDefaults.topAppBarColors(
            containerColor = MeyraBackground,
            titleContentColor = TextPrimary
        ),
        modifier = modifier.border(
            width = 0.5.dp,
            color = MeyraBorder.copy(alpha = 0.5f),
            shape = RoundedCornerShape(0.dp)
        )
    )
}
