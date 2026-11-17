import i18n from "i18next"
import { initReactI18next } from "react-i18next"

export const enTranslation = {
  app: { title: "TODO" },
  todos: {
    activeCount_one: "{{count}} item left",
    activeCount_other: "{{count}} items left",
    form: {
      label: "Add a TODO",
      titleLabel: "Title",
      titlePlaceholder: "What needs doing?",
      notesLabel: "Notes",
      notesPlaceholder: "Notes (optional)",
      add: "Add"
    },
    edit: {
      label: "Edit {{title}}",
      titleLabel: "Edit title",
      notesLabel: "Edit notes",
      save: "Save",
      cancel: "Cancel"
    },
    row: {
      toggle: "Mark {{title}} complete",
      edit: "Edit {{title}}",
      delete: "Delete {{title}}"
    },
    filters: {
      label: "Filter TODOs",
      all: "All",
      active: "Active",
      completed: "Completed"
    },
    list: {
      label: "TODO items",
      loading: "Loading…",
      empty: "Nothing to do yet. Add your first TODO above.",
      emptyFiltered: {
        all: "Nothing to do yet. Add your first TODO above.",
        active: "No active TODOs. Nice work.",
        completed: "No completed TODOs yet."
      }
    }
  },
  errors: {
    notFound: "That TODO no longer exists. The list has been refreshed.",
    csrf: "Your session expired. Please try again.",
    validation: "That change isn't valid. Titles must be 1–200 characters.",
    network: "Can't reach the server. Check that the API is running and try again.",
    unexpected: "Something went wrong. Please try again.",
    dismiss: "Dismiss error"
  }
} as const

i18n
  .use(initReactI18next)
  .init({ resources: { en: { translation: enTranslation } }, lng: "en", fallbackLng: "en", interpolation: { escapeValue: false } })

export default i18n
