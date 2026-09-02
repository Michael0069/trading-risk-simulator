export function getBrokerResultTone(response: any): 'success' | 'caution' | 'neutral' {
  if (!response || Array.isArray(response)) {
    return 'neutral';
  }

  if (response.accepted_reason === false) {
    return 'caution';
  }

  if (response.accepted_reason === true) {
    return 'success';
  }

  if (response.intervention === 'BLOCK') {
    return 'caution';
  }

  if (response.intervention === 'WARN') {
    return 'caution';
  }

  return 'neutral';
}

export function getBrokerResultLabel(response: any): string {
  if (!response) {
    return 'Result ready';
  }

  if (response.accepted_reason === true) {
    return 'Reason accepted';
  }

  if (response.accepted_reason === false) {
    return 'Reason refined';
  }

  if (response.intervention) {
    return response.intervention;
  }

  if (Array.isArray(response)) {
    return `${response.length} records`;
  }

  return 'Result ready';
}

export function isTradeSuggestionResponse(response: any): boolean {
  return Boolean(response?.instrument && response?.entry_price);
}

export function isBehaviorAssessResponse(response: any): boolean {
  return Boolean(response?.intervention && typeof response?.score === 'number');
}
