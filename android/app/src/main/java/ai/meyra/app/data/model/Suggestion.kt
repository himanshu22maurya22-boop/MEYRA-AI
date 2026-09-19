package ai.meyra.app.data.model

data class Suggestion(
    val id: String,
    val category: SuggestionCategory,
    val title: String,
    val description: String,
    val prompt: String
)

enum class SuggestionCategory {
    EXPLAIN,
    WRITE,
    CODE
}

object DefaultSuggestions {
    val list = listOf(
        Suggestion(
            id = "explain",
            category = SuggestionCategory.EXPLAIN,
            title = "Explain something",
            description = "Quantum computing in simple terms with an everyday analogy",
            prompt = "Explain how quantum computing works compared to classical computing, using an intuitive everyday analogy that anyone can understand."
        ),
        Suggestion(
            id = "write",
            category = SuggestionCategory.WRITE,
            title = "Help me write",
            description = "Executive strategy memo for integrating AI into business workflows",
            prompt = "Draft a concise, high-impact executive memo proposing a roadmap for integrating AI automation into customer support operations safely."
        ),
        Suggestion(
            id = "code",
            category = SuggestionCategory.CODE,
            title = "Help me code",
            description = "Kotlin Coroutines Flow worker queue with retry & timeout",
            prompt = "Write a complete, production-ready Kotlin Coroutines implementation of a concurrent worker queue with retry backoff and timeout handling."
        )
    )
}
