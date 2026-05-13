import { ShowHydrogenLabels } from 'application/render';
import { ketcherProvider } from 'application/ketcherProvider';

enum IndigoShowHydrogenLabelsMode {
  OFF = 'none',
  HETERO = 'hetero',
  TERMINAL_HETERO = 'terminal-hetero',
  ALL = 'all',
}

export function getLabelRenderModeForIndigo(ketcherId: string) {
  // Terminal does not supported by indigo so TERMINAL_HETERO used
  // Off removing all labels in indigo so HETERO used
  const renderModeMapping = {
    [ShowHydrogenLabels.Off]: IndigoShowHydrogenLabelsMode.HETERO,
    [ShowHydrogenLabels.Hetero]: IndigoShowHydrogenLabelsMode.HETERO,
    [ShowHydrogenLabels.Terminal]: IndigoShowHydrogenLabelsMode.TERMINAL_HETERO,
    [ShowHydrogenLabels.TerminalAndHetero]:
      IndigoShowHydrogenLabelsMode.TERMINAL_HETERO,
    [ShowHydrogenLabels.On]: IndigoShowHydrogenLabelsMode.ALL,
  };

  // getKetcher throws on missing id (e.g., after editor unmount with a stale
  // ketcherId still set on the service). Fall back to OFF in that case.
  let ketcher;
  try {
    ketcher = ketcherProvider.getKetcher(ketcherId);
  } catch {
    return IndigoShowHydrogenLabelsMode.OFF;
  }

  return (
    renderModeMapping[ketcher.editor.options().showHydrogenLabels] ||
    IndigoShowHydrogenLabelsMode.OFF
  );
}
