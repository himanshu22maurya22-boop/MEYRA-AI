package ai.meyra.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ai.meyra.app.R
import ai.meyra.app.data.model.DefaultSuggestions
import ai.meyra.app.data.model.Suggestion
import ai.meyra.app.ui.theme.*

@Composable
fun HomeScreen(
    onSelectSuggestion: (Suggestion) -> Unit,
    onOpenAbout: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    val scrollState = rememberScrollState()

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(scrollState)
            .padding(horizontal = 20.dp, vertical = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        // Hero Logo Container
        Box(
            modifier = Modifier
                .size(72.dp)
                .clip(RoundedCornerShape(20.dp))
                .background(MeyraSurface)
                .border(1.dp, MeyraBorderLight, RoundedCornerShape(20.dp)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                painter = painterResource(id = R.drawable.ic_meyra_logo),
                contentDescription = "MEYRA AI Emblem",
                tint = androidx.compose.ui.graphics.Color.Unspecified,
                modifier = Modifier.size(36.dp)
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Futuristic Badge
        Surface(
            color = MeyraPrimary.copy(alpha = 0.12f),
            shape = CircleShape,
            border = ButtonDefaults.outlinedButtonBorder.copy(
                brush = androidx.compose.ui.graphics.SolidColor(MeyraPrimary.copy(alpha = 0.3f))
            )
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.AutoAwesome,
                    contentDescription = null,
                    tint = MeyraPrimaryLight,
                    modifier = Modifier.size(12.dp)
                )
                Text(
                    text = "MEYRA AI • Next-Gen Intelligence",
                    style = MaterialTheme.typography.labelSmall,
                    color = MeyraPrimaryLight,
                    fontWeight = FontWeight.Medium
                )
            }
        }

        Spacer(modifier = Modifier.height(18.dp))

        // Welcome text: "MEYRA AI"
        Text(
            text = "MEYRA AI",
            style = MaterialTheme.typography.headlineLarge,
            color = TextPrimary,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(6.dp))

        // Subtitle: "Your Intelligent AI Companion"
        Text(
            text = "Your Intelligent AI Companion",
            style = MaterialTheme.typography.titleMedium,
            color = TextSecondary,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(28.dp))

        // Suggestion Cards Section
        Text(
            text = "START A CONVERSATION",
            style = MaterialTheme.typography.labelSmall,
            color = TextMuted,
            fontWeight = FontWeight.SemiBold,
            letterSpacing = 1.sp,
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 12.dp, start = 4.dp)
        )

        Column(
            verticalArrangement = Arrangement.spacedBy(10.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            DefaultSuggestions.list.forEach { suggestion ->
                SuggestionCardItem(
                    suggestion = suggestion,
                    onClick = { onSelectSuggestion(suggestion) }
                )
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Trust badge & Creator info
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.Shield,
                contentDescription = null,
                tint = MeyraPrimaryLight.copy(alpha = 0.6f),
                modifier = Modifier.size(14.dp)
            )
            Text(
                text = "Protected with secure server-side API proxy",
                style = MaterialTheme.typography.bodySmall,
                color = TextMuted,
                fontSize = 11.sp
            )
        }

        Spacer(modifier = Modifier.height(10.dp))

        Text(
            text = "Created & Developed by Himanshu Maurya",
            style = MaterialTheme.typography.bodySmall,
            color = MeyraPrimaryLight.copy(alpha = 0.8f),
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium
        )
    }
}
