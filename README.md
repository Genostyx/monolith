# MONOLITH

A playable isometric accounting puzzle built with native HTML5 Canvas and JavaScript modules. No dependencies or external assets.

Run `npm start`, then open http://localhost:4173. Run `npm test` for ledger, crisis, conservation, and complete-playthrough verification.

Build infrastructure for cash income. Revalue subsidiaries for collateral. Issue debt to adjacent plots. Balance district demand and settle daily obligations. Win with 12 plots, 6,000 combined equity, and 12 successful settlements.

The ledger uses exact integer currency, atomic journal commits, entity balance assertions, reciprocal loan/deposit reconciliation, and a conserved finite reserve supply. The live combined balance sheet retains intercompany claims; the entity register also displays consolidation eliminations and external counterparties. Unrealized subsidiary revaluation gains do not increase parent regulatory capital.

This is a fictional economic model: appraisal ceilings and daily settlement demand are game rules, and the single 8% capital ratio uses simplified risk weights. The manual explains these assumptions. Settlement nets modeled supplier outflows against outside service payments to the parent; both legs are recorded. Default provisions are consumed on foreclosure or debt forgiveness, avoiding duplicate losses.

Mouse, touch, and keyboard controls: 1 inspect, 2 infrastructure, 3 debt links, R revalue, Space settle, arrow keys move the grid cursor, Enter act, Escape cancel. Optional procedural audio and reduced-motion support are included.
