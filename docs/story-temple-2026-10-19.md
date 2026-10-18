# Chapter thirteen: Myouren Temple, and the Mountain newspaper goal

Chapter thirteen introduces Hijiri Byakuren, Toramaru Shou, Houjuu Nue and Murasa. Ichirin is available in Kourindou without an introduction card. All earlier skill unlocks remain available. Both players receive six random cards, with the human guaranteed Byakuren and at least one other Temple original. Undealt Temple originals are shuffled among the next five draws; Kourindou always stocks Ichirin and two random previously unlocked fifth cards. First actor remains random. The opponent uses the existing Medium AI and has no opening-hand knowledge or extra chapter-specific placement priorities.

Winning clears the chapter. Its three independently saved optional objectives are:

- Complete the Temple faction, using the existing board-claim or complete-discard-pile rule.
- Successfully use all three Byakuren effects: extra turns, return cards/create wasteland, and look/take/reorder. They may be used in any order; their successful uses accumulate within the match. Selecting an unavailable effect, declining payment, cancelling every target or providing an invalid peek arrangement does not count. Repeated uses do not substitute for a missing effect.
- Win with at least one future bonus turn still unused. Byakuren and Sakuya grants add to the count; entering a bonus turn consumes one before its action. Mai and Satono's future action counts while pending and transfers once into the active queue. A regular action does not consume the queue, and Youmu's free placement does not by itself grant a bonus turn. The count is captured when the winner is decided, so winning on the last bonus turn is different from winning with another one left.

The hint is: **无论如何，使用圣白莲的所有功能必须要有很多卡牌来支付代价吧。但是，如果有羁绊的力量，轻松的完成也不是不可能的？**

In chapter five, read a newspaper and then make one correct guess. Publishing your own Aya newspaper already displays its reports and counts as reading; paying to subscribe to another player's report still counts. A folded opponent report does not expose its information and does not count. No separate expand button or paid-subscription requirement was added to the objective. Reading later does not retroactively count a previous guess. The `newsGuess` save key is unchanged, preserving earlier stars.

The new Temple suite checks 1024 conserved private opening deals; all six orders of Byakuren's three effects; a real one-placement three-star victory costing just one card with three Temple allies; production Sakuya, Youmu and dancer turn chains; payments and cancelled/invalid effects; AI evaluation isolation; faction collection; persistent stars and replay; and English/Chinese text. Existing Mountain tests now cover both owner and paid newspaper paths. Existing chapter-count, Heaven-to-Temple progression and mobile introduction tests include the thirteenth chapter.

Validation: **2463 checks in 41 suites pass**, including four complete private Medium-AI Temple games. The two historical snapshot suites were rerun after updating their current-version assertion from v33 to v34; all restored-card assertions are unchanged.

Game effects, payment amounts, AI policy source, turn controller, mobile layouts, card physics and perfect-star gradient styling are preserved. Chapter-specific counters observe successful effects and the existing turn sequence. Rules version is `2026-10-19-story-temple-v34`; its rules digest changes because the shared engine includes story definitions and objective hooks. The AI policy digest remains `8c4a5243bd74a5f73ad2e8f67c5f0d1a5ccea2d1925c63048f3b82320114f3cf`.

Tests use production game functions with controlled DOM and deterministic seeds. Physical browser pixels and phone performance are not measured.
