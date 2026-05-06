import type { InsightsViewDeps } from '../insights-view.js';
import type { Insight } from '@src/models/index.js';

/**
 * Compute split-bar widths for time-of-month patterns.
 * Returns [firstHalfPercent, secondHalfPercent].
 */
export function computeSplitBarRatio(firstHalf: number, secondHalf: number): [number, number] {
  const total = firstHalf + secondHalf;
  if (total <= 0) return [50, 50];
  return [(firstHalf / total) * 100, (secondHalf / total) * 100];
}

/**
 * Render the Patterns sub-view: visual summary cards from longitudinal-trend-detector output.
 */
export function renderPatternsView(container: HTMLElement, deps: InsightsViewDeps): void {
  container.innerHTML = '';

  const profileId = deps.activeChildProfileId();
  if (!profileId) return;

  // Get longitudinal trend insights
  let insights: Insight[];
  try {
    insights = deps.dataStore.getInsights(profileId, { types: ['longitudinal_trend'] });
  } catch {
    const fallback = document.createElement('div');
    fallback.style.cssText = 'text-align:center;padding:24px 16px;color:var(--text-dim);font-size:0.75rem;';
    fallback.textContent = 'Unable to load patterns right now. Try again later.';
    container.appendChild(fallback);
    return;
  }

  if (insights.length === 0) {
    const msg = document.createElement('div');
    msg.style.cssText = 'text-align:center;padding:24px 16px;color:var(--text-dim);font-size:0.75rem;line-height:1.5;';
    msg.innerHTML = `<span style="font-size:1.4rem;">🌱</span><br><span style="font-weight:600;color:var(--text);">Patterns will appear after about 30 days of logging</span><br>Keep going — the more you log, the clearer the picture becomes.`;
    container.appendChild(msg);
    return;
  }

  // Render each insight as a pattern card
  for (const insight of insights) {
    const card = document.createElement('div');
    card.className = 'soft-card';
    card.style.cssText = 'padding:12px 14px;margin-bottom:10px;';

    // Narrative
    const narrative = document.createElement('p');
    narrative.textContent = insight.narrative;
    narrative.style.cssText = 'font-size:0.72rem;color:var(--text);line-height:1.5;margin:0 0 8px;';
    card.appendChild(narrative);

    // Supporting signals as badges
    if (insight.supportingSignals.length > 0) {
      const badgeRow = document.createElement('div');
      badgeRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;';
      for (const signal of insight.supportingSignals) {
        const badge = document.createElement('span');
        badge.textContent = signal.description;
        badge.style.cssText = 'display:inline-block;padding:3px 8px;border-radius:10px;font-size:0.6rem;background:var(--blue-light, rgba(74,144,226,0.1));color:var(--blue, #4A90E2);';
        badge.title = `Observed ${signal.observationCount} times. Factors: ${signal.contributingFactors.join(', ')}`;
        badgeRow.appendChild(badge);
      }
      card.appendChild(badgeRow);
    }

    // Time span and confidence
    const meta = document.createElement('div');
    meta.style.cssText = 'font-size:0.62rem;color:var(--text-muted);margin-bottom:6px;';
    const parts: string[] = [];
    parts.push(`Confidence: ${insight.confidenceScore}`);
    if (insight.timeSpan) {
      const start = insight.timeSpan.start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const end = insight.timeSpan.end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      parts.push(`${start} – ${end}`);
    }
    meta.textContent = parts.join(' · ');
    card.appendChild(meta);

    // Split-bar for time-of-month patterns (if signal mentions first/second half)
    for (const signal of insight.supportingSignals) {
      const match = signal.description.match(/(\d+) of (\d+)/);
      if (match && signal.description.includes('half')) {
        const dominant = parseInt(match[1], 10);
        const total = parseInt(match[2], 10);
        const other = total - dominant;
        const isFirstHalf = signal.description.includes('first half');
        const [firstPct, secondPct] = isFirstHalf
          ? computeSplitBarRatio(dominant, other)
          : computeSplitBarRatio(other, dominant);

        const barContainer = document.createElement('div');
        barContainer.style.cssText = 'display:flex;height:16px;border-radius:8px;overflow:hidden;margin-bottom:6px;';

        const firstBar = document.createElement('div');
        firstBar.style.cssText = `width:${firstPct}%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-size:0.5rem;color:white;font-weight:600;`;
        firstBar.textContent = `1st: ${Math.round(firstPct)}%`;

        const secondBar = document.createElement('div');
        secondBar.style.cssText = `width:${secondPct}%;background:var(--warm, #F2994A);display:flex;align-items:center;justify-content:center;font-size:0.5rem;color:white;font-weight:600;`;
        secondBar.textContent = `2nd: ${Math.round(secondPct)}%`;

        barContainer.appendChild(firstBar);
        barContainer.appendChild(secondBar);
        card.appendChild(barContainer);
      }
    }

    // Communication scripts (collapsible)
    if (insight.communicationScripts && insight.communicationScripts.length > 0) {
      const scriptSection = document.createElement('div');
      scriptSection.style.cssText = 'margin-top:6px;border-top:1px solid var(--border);padding-top:6px;';

      const toggleBtn = document.createElement('button');
      toggleBtn.textContent = '💬 Communication scripts ▸';
      toggleBtn.style.cssText = 'border:none;background:none;font-size:0.62rem;color:var(--accent);cursor:pointer;padding:0;font-weight:600;';

      const scriptContent = document.createElement('div');
      scriptContent.style.cssText = 'display:none;margin-top:6px;';

      for (const script of insight.communicationScripts) {
        const scriptCard = document.createElement('div');
        scriptCard.style.cssText = 'padding:6px 8px;background:rgba(74,144,226,0.04);border-radius:8px;margin-bottom:4px;';
        scriptCard.innerHTML = `
          <div style="font-size:0.62rem;font-weight:600;color:var(--text);margin-bottom:2px;">${script.topic}</div>
          <div style="font-size:0.62rem;color:var(--text);font-style:italic;line-height:1.4;">"${script.script}"</div>
          <div style="font-size:0.55rem;color:var(--text-dim);margin-top:2px;">${script.context}</div>`;
        scriptContent.appendChild(scriptCard);
      }

      toggleBtn.addEventListener('click', () => {
        const isHidden = scriptContent.style.display === 'none';
        scriptContent.style.display = isHidden ? 'block' : 'none';
        toggleBtn.textContent = isHidden ? '💬 Communication scripts ▾' : '💬 Communication scripts ▸';
      });

      scriptSection.appendChild(toggleBtn);
      scriptSection.appendChild(scriptContent);
      card.appendChild(scriptSection);
    }

    container.appendChild(card);
  }
}
