/** TALERA language registry — one stable key per exact UI placement/context.
 * Every entry has independent nl/en/de/fr/es values, even when original Dutch text is identical.
 * Edit this file only for language/content changes. No account or presentation logic.
 * Status: isolated i18n candidate (2026-11-07).
 */
export const CONTEXT_WORDS = {
  "account.register.name.label": {
    "nl": "Naam",
    "en": "Name",
    "de": "Name",
    "fr": "Nom",
    "es": "Nombre"
  },
  "account.register.username.label": {
    "nl": "Unieke gebruikersnaam",
    "en": "Unique username",
    "de": "Eindeutiger Benutzername",
    "fr": "Nom d’utilisateur unique",
    "es": "Nombre de usuario único"
  },
  "account.register.username.placeholder": {
    "nl": "bijvoorbeeld mark smits",
    "en": "e.g. mark smits",
    "de": "z. B. mark smits",
    "fr": "par exemple mark smits",
    "es": "por ejemplo mark smits"
  },
  "account.register.birthDate.label": {
    "nl": "Geboortedatum",
    "en": "Date of birth",
    "de": "Geburtsdatum",
    "fr": "Date de naissance",
    "es": "Fecha de nacimiento"
  },
  "account.register.email.label": {
    "nl": "E-mailadres",
    "en": "Email address",
    "de": "E-Mail-Adresse",
    "fr": "Adresse e-mail",
    "es": "Correo electrónico"
  },
  "account.register.password.label": {
    "nl": "Wachtwoord (minimaal 8 tekens)",
    "en": "Password (at least 8 characters)",
    "de": "Passwort (mindestens 8 Zeichen)",
    "fr": "Mot de passe (8 caractères minimum)",
    "es": "Contraseña (mínimo 8 caracteres)"
  },
  "account.register.confirm.label": {
    "nl": "Wachtwoord herhalen",
    "en": "Repeat password",
    "de": "Passwort wiederholen",
    "fr": "Répéter le mot de passe",
    "es": "Repetir contraseña"
  },
  "account.register.submit": {
    "nl": "Account aanmaken",
    "en": "Create account",
    "de": "Konto erstellen",
    "fr": "Créer un compte",
    "es": "Crear cuenta"
  },
  "account.register.signInInstead": {
    "nl": "Ik heb al een account",
    "en": "I already have an account",
    "de": "Ich habe bereits ein Konto",
    "fr": "J’ai déjà un compte",
    "es": "Ya tengo una cuenta"
  },
  "account.login.email.label": {
    "nl": "E-mailadres",
    "en": "Email address",
    "de": "E-Mail-Adresse",
    "fr": "Adresse e-mail",
    "es": "Correo electrónico"
  },
  "account.login.password.label": {
    "nl": "Wachtwoord",
    "en": "Password",
    "de": "Passwort",
    "fr": "Mot de passe",
    "es": "Contraseña"
  },
  "account.login.submit": {
    "nl": "Aanmelden",
    "en": "Sign in",
    "de": "Anmelden",
    "fr": "Se connecter",
    "es": "Iniciar sesión"
  },
  "account.login.createInstead": {
    "nl": "Account aanmaken",
    "en": "Create account",
    "de": "Konto erstellen",
    "fr": "Créer un compte",
    "es": "Crear cuenta"
  },
  "account.login.forgotPassword": {
    "nl": "Wachtwoord vergeten?",
    "en": "Forgot your password?",
    "de": "Passwort vergessen?",
    "fr": "Mot de passe oublié ?",
    "es": "¿Has olvidado tu contraseña?"
  },
  "account.forgot.email.label": {
    "nl": "E-mailadres",
    "en": "Email address",
    "de": "E-Mail-Adresse",
    "fr": "Adresse e-mail",
    "es": "Correo electrónico"
  },
  "account.forgot.submit": {
    "nl": "Herstelmail aanvragen",
    "en": "Request recovery email",
    "de": "Wiederherstellungs-E-Mail anfordern",
    "fr": "Demander un e-mail de récupération",
    "es": "Solicitar correo de recuperación"
  },
  "account.profile.birthDate.heading": {
    "nl": "Mijn geboortedatum",
    "en": "My date of birth",
    "de": "Mein Geburtsdatum",
    "fr": "Ma date de naissance",
    "es": "Mi fecha de nacimiento"
  },
  "account.profile.birthDate.explanation": {
    "nl": "Alleen voor je eigen tijdlijnen. Niet zichtbaar voor andere gebruikers.",
    "en": "Only for your own timelines. Not visible to other users.",
    "de": "Nur für deine eigenen Zeitleisten. Für andere nicht sichtbar.",
    "fr": "Uniquement pour vos propres chronologies. Invisible pour les autres utilisateurs.",
    "es": "Solo para tus propias líneas de tiempo. No visible para otros usuarios."
  },
  "account.profile.birthDate.label": {
    "nl": "Geboortedatum",
    "en": "Date of birth",
    "de": "Geburtsdatum",
    "fr": "Date de naissance",
    "es": "Fecha de nacimiento"
  },
  "account.profile.birthDate.save": {
    "nl": "Geboortedatum bewaren",
    "en": "Save date of birth",
    "de": "Geburtsdatum speichern",
    "fr": "Enregistrer la date de naissance",
    "es": "Guardar fecha de nacimiento"
  },
  "account.profile.birthDate.loaded": {
    "nl": "Geboortedatum opgeslagen bij je account.",
    "en": "Date of birth saved to your account.",
    "de": "Geburtsdatum in deinem Konto gespeichert.",
    "fr": "Date de naissance enregistrée dans votre compte.",
    "es": "Fecha de nacimiento guardada en tu cuenta."
  },
  "account.profile.birthDate.saved": {
    "nl": "Geboortedatum bewaard. Bij het opnieuw openen gebruiken beide tijdlijnen deze datum.",
    "en": "Date of birth saved. Both timelines will use it when reopened.",
    "de": "Geburtsdatum gespeichert. Beide Zeitleisten verwenden es beim nächsten Öffnen.",
    "fr": "Date de naissance enregistrée. Les deux chronologies l’utiliseront à la prochaine ouverture.",
    "es": "Fecha de nacimiento guardada. Ambas líneas de tiempo la usarán al volver a abrir."
  },
  "account.profile.birthDate.failed": {
    "nl": "Opslaan is niet gelukt.",
    "en": "Could not save.",
    "de": "Speichern fehlgeschlagen.",
    "fr": "Enregistrement impossible.",
    "es": "No se pudo guardar."
  },
  "account.profile.birthDate.invalid": {
    "nl": "Vul een geldige geboortedatum in.",
    "en": "Enter a valid date of birth.",
    "de": "Bitte ein gültiges Geburtsdatum eingeben.",
    "fr": "Saisissez une date de naissance valide.",
    "es": "Introduce una fecha de nacimiento válida."
  },
  "present.navigation.backToLife.aria": {
    "nl": "Terug naar Mijn leven",
    "en": "Back to My life",
    "de": "Zurück zu Mein Leben",
    "fr": "Retour à Ma vie",
    "es": "Volver a Mi vida"
  },
  "present.navigation.editMemory.aria": {
    "nl": "Bewerk deze herinnering",
    "en": "Edit this memory",
    "de": "Diese Erinnerung bearbeiten",
    "fr": "Modifier ce souvenir",
    "es": "Editar este recuerdo"
  },
  "tell.writer.storyPrompt": {
    "nl": "Wat wil je over dit moment vertellen?",
    "en": "What would you like to say about this moment?",
    "de": "Was möchtest du über diesen Moment erzählen?",
    "fr": "Que souhaitez-vous raconter de ce moment ?",
    "es": "¿Qué quieres contar sobre este momento?"
  },
  "tell.voice.recordSaved": {
    "nl": "Gesproken verhaal toegevoegd",
    "en": "Voice recording added",
    "de": "Sprachaufnahme hinzugefügt",
    "fr": "Enregistrement vocal ajouté",
    "es": "Grabación de voz añadida"
  },
  "tell.voice.narrationSaved": {
    "nl": "Gesproken verhaal toegevoegd",
    "en": "Narration added",
    "de": "Gesprochene Geschichte hinzugefügt",
    "fr": "Récit vocal ajouté",
    "es": "Narración añadida"
  },
  "social.comment.composePlaceholder": {
    "nl": "Schrijf een reactie…",
    "en": "Write a comment…",
    "de": "Kommentar schreiben…",
    "fr": "Écrire un commentaire…",
    "es": "Escribe un comentario…"
  },
  "messages.thread.composePlaceholder": {
    "nl": "Schrijf een reactie…",
    "en": "Write a reply…",
    "de": "Antwort schreiben…",
    "fr": "Écrire une réponse…",
    "es": "Escribe una respuesta…"
  }
};
