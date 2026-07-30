export type ExcedenteSelectionState = Record<string, boolean>;

/**
 * Check if a category is selected to count toward the excedente sobrante KPI.
 * Categories are NOT selected by default unless explicitly marked true.
 */
export function isExcedenteSelected(
  categoryId: string,
  state: ExcedenteSelectionState
): boolean {
  return state[categoryId] === true;
}

export function toggleExcedenteSelection(
  state: ExcedenteSelectionState,
  categoryId: string
): ExcedenteSelectionState {
  return { ...state, [categoryId]: !isExcedenteSelected(categoryId, state) };
}

export function getExcedenteSelectionStorageKey(
  selectedPeriodId: string,
  comparisonPeriodId: string
): string {
  return `budget_excedente_selection_${selectedPeriodId}_${comparisonPeriodId}`;
}

export function saveExcedenteSelectionToStorage(
  selectedPeriodId: string,
  comparisonPeriodId: string,
  state: ExcedenteSelectionState
): void {
  try {
    localStorage.setItem(
      getExcedenteSelectionStorageKey(selectedPeriodId, comparisonPeriodId),
      JSON.stringify(state)
    );
  } catch (error) {
    console.error('Error saving excedente selection:', error);
  }
}

export function loadExcedenteSelectionFromStorage(
  selectedPeriodId: string,
  comparisonPeriodId: string
): ExcedenteSelectionState {
  try {
    const raw = localStorage.getItem(
      getExcedenteSelectionStorageKey(selectedPeriodId, comparisonPeriodId)
    );
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed as ExcedenteSelectionState;
      }
    }
  } catch (error) {
    console.error('Error loading excedente selection:', error);
  }
  return {};
}
