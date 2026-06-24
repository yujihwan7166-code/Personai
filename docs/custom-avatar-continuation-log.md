# Custom Avatar Continuation Log

This log tracks continuation work for the custom AI avatar refresh after the initial occupation, specialist, lifestyle, persona, religion, ideology, and partial celebrity batches.

## Style Lock

- Match the provided reference images: bright, clean, semi-realistic anime web-app card illustration.
- Keep every image 16:9 landscape, with a centered character and role props readable in both thumbnails and the detail panel.
- Use active work scenes rather than static portrait-only compositions.
- Rotate gaze, body angle, camera height, and pose across the batch. Avoid repeating downward-left gaze, the same three-quarter face, the same soft smile, and seated desk poses.
- Avoid text, watermarks, logos, brand marks, readable writing, photorealism, childish flat icon style, and dark concept-art mood.

## Completed In This Continuation

| id | category | output path | status | prompt notes |
| --- | --- | --- | --- | --- |
| audit-2026-06-18 | all custom | `scripts/audit-custom-avatar-complete.mjs` | added full-scope verifier | Runtime DEFAULT_EXPERTS audit covers all 322 custom experts and checks missing avatarUrl, png extension, file existence, legacy jpg/jpeg/svg exposure, PNG dimensions, file size, duplicate URLs, and duplicate file hashes. It found 34 missing avatarUrls and 15 old 72x72 mythology placeholder PNGs before continuation work. |
| devils-advocate | perspective | `/logos/persona/devils-advocate.png` | generated and connected | Bright meeting-room debate strategist presenting the opposing argument with blank cue cards and abstract board shapes; viewer-left gaze and raised-hand pose to avoid repeated downward desk compositions. |
| fact-checker | perspective | `/logos/persona/fact-checker.png` | generated and connected | Sunlit verification office, magnifying glass, blank source cards, empty checklist, viewer-right gaze for precise evidence-checking persona. |
| factbomber | perspective | `/logos/persona/factbomber.png` | generated and connected | Bright analytics room, abstract charts, evidence cards placed decisively on the table, near-viewer gaze for forceful data-driven rebuttal. |
| question-human | perspective | `/logos/persona/question-human.png` | generated and connected | Workshop facilitator with blank cards and non-readable circle-arrow board, off-frame listener interaction to communicate relentless questioning. |
| doubt-man | perspective | `/logos/persona/doubt-man.png` | generated and connected | Clean review room, magnifying lens, abstract evidence board, near-direct raised-eyebrow gaze for skeptical challenge. |
| nitpicker | perspective | `/logos/persona/nitpicker.png` | generated and connected | Design review desk, magnifying loupe, calipers, red pencil, high-angle detail-checking pose for tiny flaw detection. |
| empathy-person | perspective | `/logos/persona/empathy-person.png` | generated and connected | Cozy counseling room, tea and tissue cues, open-handed listener facing an off-frame partner for warm empathy. |
| healing-bot | perspective | `/logos/persona/healing-bot.png` | generated and connected | Bright wellness lounge, warm cup and blanket, subtle future-guide cue without turning into a childish mascot. |
| emotional | perspective | `/logos/persona/emotional.png` | generated and connected | Rain-washed creative studio, headphones, blank journal and mood swatches, upward window gaze for feeling-first interpretation. |
| romanticist | perspective | `/logos/persona/romanticist.png` | generated and connected | Sunlit conservatory garden, rose and blank sketchbook, distant hopeful gaze for idealistic romantic framing. |
| uncomfortable | perspective | `/logos/persona/uncomfortable.png` | generated and connected | Meeting-room critic calmly pointing at abstract warning clusters, group silhouettes in background for uncomfortable issue-raising. |
| harsh-tongue | perspective | `/logos/persona/harsh-tongue.png` | regenerated and connected | Clean critique studio with blank review props, red pen and direct feedback gesture; first draft was rejected for too much pseudo-text. |
| scary-interviewer | perspective | `/logos/persona/scary-interviewer.png` | generated and connected | Modern interview room, stern interviewer across from candidate silhouette, blank papers and pressure posture without horror styling. |
| nagging-king | perspective | `/logos/persona/nagging-king.png` | regenerated and connected | Bright task command center, clipboard and blank checklist; first draft rejected for a laptop logo-like mark. |
| narcissist | perspective | `/logos/persona/narcissist.png` | generated and connected | Stylish mirror lounge, self-admiring reflection and polished posture for self-absorbed persona. |
| chuunibyou | perspective | `/logos/persona/chuunibyou.png` | generated and connected | Bright club-room theatrical pose, harmless glowing prop and costume cues without dark fantasy styling. |
| coward | perspective | `/logos/persona/coward.png` | generated and connected | Safety planning room, vest, helmet, emergency bag and blank route map for cautious risk-averse persona. |
| boomer | perspective | `/logos/persona/boomer.png` | generated and connected | Older mentor comparing old notebook to a younger person's tablet, nostalgic advice scene without newspaper text. |
| tmi-talker | perspective | `/logos/persona/tmi-talker.png` | regenerated and connected | Office lounge storyteller with too many blank cards/photos; first draft rejected for cafe menu pseudo-text. |
| apollo | mythology | `/logos/mythology/apollo.png` | generated and connected | Sunlit marble terrace, lyre, laurel and radiant gold daylight for Apollo's sunlight/music/prophecy identity. |
| artemis | mythology | `/logos/mythology/artemis.png` | generated and connected | Bright moon-dawn forest, bow, quiver, moon and distant deer for Artemis' hunt and wilderness cues. |
| ares | mythology | `/logos/mythology/ares.png` | generated and connected | Sunlit training ground, bronze shield, spear and tactical table for martial identity without gore. |
| prometheus | mythology | `/logos/mythology/prometheus.png` | generated and connected | Sunrise cliff, bronze torch and heroic wind-shielding pose for the bringer of fire without punishment imagery. |
| aphrodite | mythology | `/logos/mythology/aphrodite.png` | generated and connected | Sunlit seaside terrace, roses, shells, sea foam and distant doves for beauty/love identity; flagged for later grid fit check due ornate finish. |
| hermes | mythology | `/logos/mythology/hermes.png` | generated and connected | Bright ancient road, winged cap/sandals, satchel, staff and blank scroll for messenger/travel identity. |
| dionysus | mythology | `/logos/mythology/dionysus.png` | generated and connected | Warm vineyard courtyard, grapes, clay cup and theater mask cues for revelry/theater identity; flagged for later grid fit check due ornate finish. |
| freya | mythology | `/logos/mythology/freya.png` | generated and connected | Golden Nordic meadow, hall, luminous necklace, falcon feather and noble gaze for love/magic/strength identity. |
| fenrir | mythology | `/logos/mythology/fenrir.png` | regenerated and connected | Bright snowy valley with massive calm wolf and glowing ribbon-chain; first draft rejected for watermark-like corner mark. |
| ra | mythology | `/logos/mythology/ra.png` | generated and connected | Desert sunrise over Nile, solar disk, falcon-inspired headpiece and solar staff without readable hieroglyphs. |
| isis | mythology | `/logos/mythology/isis.png` | generated and connected | Nile temple terrace, protective wing cloak, lotus and healing glow for magic/protection identity. |
| ganesha | mythology | `/logos/mythology/ganesha.png` | generated and connected | Respectful warm temple courtyard with elephant-headed wisdom figure, lotus, sweets and books. |
| kali | mythology | `/logos/mythology/kali.png` | generated and connected | Bright dawn temple, cosmic light, lotus and protective blade; avoided gore, skulls and horror treatment. |
| susanoo | mythology | `/logos/mythology/susanoo.png` | generated and connected | Bright storm-clearing seashore, sword, wind ribbons, waves and shrine silhouette for storm deity identity. |
| quetzalcoatl | mythology | `/logos/mythology/quetzalcoatl.png` | regenerated and connected | Clean stepped temple courtyard, feathered serpent, wind and corn cues; first draft rejected for scroll pseudo-text and splash-art feel. |
| zeus | mythology | `/logos/mythology/zeus.png` | replaced old 72x72 PNG | Bright Olympus terrace, lightning, clouds and marble columns for sky/thunder ruler identity. |
| athena | mythology | `/logos/mythology/athena.png` | replaced old 72x72 PNG | Marble academy courtyard, owl, shield, spear and strategy table for wisdom/strategy identity. |
| poseidon | mythology | `/logos/mythology/poseidon.png` | replaced old 72x72 PNG | Sunlit ocean palace, trident, turquoise waves and sea cues for Poseidon identity. |
| hades | mythology | `/logos/mythology/hades.png` | regenerated and replaced old 72x72 PNG | Clean twilight judgment hall, pomegranate, gemstones and scepter; first draft rejected as too dark/high-fantasy. |
| odysseus-myth | mythology | `/logos/mythology/odysseus-myth.png` | replaced old 72x72 PNG | Sunlit ship deck, blank sea chart, bronze navigation tool and island horizon for clever voyager identity. |
| achilles | mythology | `/logos/mythology/achilles.png` | replaced old 72x72 PNG | Training arena, bronze shield and ankle-guard adjustment for warrior identity plus heel-weakness cue. |
| medusa | mythology | `/logos/mythology/medusa.png` | replaced old 72x72 PNG | Sunlit courtyard, serpent hair, stone figures and mirror shield for petrifying-gaze identity without horror. |
| odin | mythology | `/logos/mythology/odin.png` | regenerated and replaced old 72x72 PNG | Nordic hall, one-eyed wise ruler, ravens and spear; early drafts rejected for map pseudo-text/rune-heavy detail. |
| thor | mythology | `/logos/mythology/thor.png` | replaced old 72x72 PNG | Bright mountain ridge, compact hammer, lightning arcs and heroic stance for thunder deity identity. |
| loki | mythology | `/logos/mythology/loki.png` | replaced old 72x72 PNG | Bright Nordic hall, blank cards, mask props, green illusion cue and sly expression for trickster identity. |
| gilgamesh | mythology | `/logos/mythology/gilgamesh.png` | regenerated and replaced old 72x72 PNG | Sunlit Mesopotamian terrace, ziggurat, blank clay tablet and staff; first draft rejected for script-like ornamentation. |
| anubis | mythology | `/logos/mythology/anubis.png` | replaced old 72x72 PNG | Golden desert temple, jackal-headed guide, balance scale, feather and heart-stone cue for judgment identity. |
| hanuman | mythology | `/logos/mythology/hanuman.png` | replaced old 72x72 PNG | Respectful mountain temple scene, monkey-faced divine warrior, mace and devotion gesture for courage/loyalty identity. |
| amaterasu | mythology | `/logos/mythology/amaterasu.png` | replaced old 72x72 PNG | Bright shrine sunrise, round mirror, golden light and white robes for sun/order identity. |
| cuchulainn | mythology | `/logos/mythology/cuchulainn.png` | replaced old 72x72 PNG | Green Irish hillside, spear, hound silhouette and stone ruins for Celtic warrior identity. |
| conclusion | specialist | `/logos/specialist/conclusion.png` | generated and connected to `CONCLUSION_EXPERT` | Modern decision room, blank summary cards, evidence tokens and decisive facilitator pose for final conclusion synthesis. |
| field | specialist | n/a | no DEFAULT_EXPERTS target | No `DEFAULT_EXPERTS` or exported `Expert` object with id `field` exists; occurrences are question ids such as school/research/work field prompts. |
| jobs | celebrity | `/logos/celebrity/jobs.png` | connected existing generated PNG | Product visionary, high-res PNG already present. |
| napoleon | celebrity | `/logos/celebrity/napoleon.png` | connected existing generated PNG | Strategic historical leader, high-res PNG already present. |
| lincoln | celebrity | `/logos/celebrity/lincoln.png` | connected existing generated PNG | Historical statesman, high-res PNG already present. |
| churchill | celebrity | `/logos/celebrity/churchill.png` | connected existing generated PNG | Wartime leader, high-res PNG already present. |
| einstein | celebrity | `/logos/celebrity/einstein.png` | connected existing generated PNG | Physics icon, high-res PNG already present. |
| curie | celebrity | `/logos/celebrity/curie.png` | connected existing generated PNG | Laboratory scientist, high-res PNG already present. |
| newton | celebrity | `/logos/celebrity/newton.png` | connected existing generated PNG | Scientific revolution, high-res PNG already present. |
| nietzsche | celebrity | `/logos/celebrity/nietzsche.png` | connected existing generated PNG | Philosopher, high-res PNG already present. |
| confucius | celebrity | `/logos/celebrity/confucius.png` | connected existing generated PNG | Classical philosopher, high-res PNG already present. |
| kant | celebrity | `/logos/celebrity/kant.png` | connected existing generated PNG | Philosopher, high-res PNG already present. |
| tesla | celebrity | `/logos/celebrity/tesla.png` | connected existing generated PNG | Electrical inventor, high-res PNG already present. |
| hawking | celebrity | `/logos/celebrity/hawking.png` | connected existing generated PNG | Cosmologist, high-res PNG already present. |
| darwin | celebrity | `/logos/celebrity/darwin.png` | connected existing generated PNG | Naturalist, high-res PNG already present. |
| turing | celebrity | `/logos/celebrity/turing.png` | connected existing generated PNG | Computer science pioneer, high-res PNG already present. |
| aristotle | celebrity | `/logos/celebrity/aristotle.png` | connected existing generated PNG | Classical philosopher, high-res PNG already present. |
| sunzi | celebrity | `/logos/celebrity/sunzi.png` | connected existing generated PNG | Military strategist, high-res PNG already present. |
| mlk | celebrity | `/logos/celebrity/mlk.png` | connected existing generated PNG | Civil rights leader, high-res PNG already present. |
| carnegie | celebrity | `/logos/celebrity/carnegie.png` | connected existing generated PNG | Industrialist, high-res PNG already present. |
| rockefeller | celebrity | `/logos/celebrity/rockefeller.png` | connected existing generated PNG | Industrialist, high-res PNG already present. |
| alexander | celebrity | `/logos/celebrity/alexander.png` | connected existing generated PNG | Historical conqueror, high-res PNG already present. |
| caesar | celebrity | `/logos/celebrity/caesar.png` | connected existing generated PNG | Roman statesman, high-res PNG already present. |
| shakespeare | celebrity | `/logos/celebrity/shakespeare.png` | connected existing generated PNG | Playwright, high-res PNG already present. |
| beethoven | celebrity | `/logos/celebrity/beethoven.png` | connected existing generated PNG | Composer, high-res PNG already present. |
| mozart | celebrity | `/logos/celebrity/mozart.png` | connected existing generated PNG | Composer, high-res PNG already present. |
| michelangelo | celebrity | `/logos/celebrity/michelangelo.png` | generated and connected | Renaissance studio, marble sculpture, chisel and mallet, slight viewer-facing gaze to break downward-left repetition. |
| plato | celebrity | `/logos/celebrity/plato.png` | generated and connected | Ancient Greek academy courtyard, columns, blank scroll, teaching gesture, gaze to viewer's right to vary pose and eye direction. |
| marco-polo | celebrity | `/logos/celebrity/marco-polo.png` | generated and connected | Silk Road caravan stop, blank map, compass, travel gear, leftward road gaze to vary orientation. |
| galileo | celebrity | `/logos/celebrity/galileo.png` | generated and connected | Observatory room, brass telescope, lens, abstract star charts, upward-right gaze for pose variation. |
| edison | celebrity | `/logos/celebrity/edison.png` | generated and connected | Invention workshop, glowing bulb held toward viewer, tools and glass bulbs, near-viewer gaze for variety. |
| hannibal | celebrity | `/logos/celebrity/hannibal.png` | generated and connected | Ancient command tent, tactical map, mountain pass, distant elephant cue, strategy-table gaze without battle violence. |
| columbus | celebrity | `/logos/celebrity/columbus.png` | generated and connected | Ship deck at sunrise, compass, astrolabe, blank chart, right-horizon gaze without flags or readable map labels. |
| machiavelli | celebrity | `/logos/celebrity/machiavelli.png` | generated and connected | Renaissance council study, blank manuscript, quill, abstract city-state map, strategy board, sideways profile gaze. |
| mandela | celebrity | `/logos/celebrity/mandela.png` | generated and connected | Civic meeting room, podium, diverse audience silhouettes, blank speech notes, welcoming reconciliation gesture, leftward audience gaze. |
| van-gogh | celebrity | `/logos/celebrity/van-gogh.png` | generated and connected | Bright painter studio, sunflowers, easel, palette, abstract swirling brush colors, over-shoulder viewer gaze. |
| tolstoy | celebrity | `/logos/celebrity/tolstoy.png` | generated and connected | 19th-century writer study, bookshelves, rural window, blank manuscript, open-hand storytelling gesture, listener-facing gaze. |
| picasso | celebrity | `/logos/celebrity/picasso.png` | generated and connected | Bright modernist studio, geometric abstract canvas, clay bust, palette knife, direct viewer gaze and active standing pose. |
| archimedes | celebrity | `/logos/celebrity/archimedes.png` | generated and connected | Ancient engineering workshop, pulley, Archimedean screw model, compass, geometry sand tray, down-right mechanical focus. |
| hippocrates | celebrity | `/logos/celebrity/hippocrates.png` | generated and connected | Ancient Greek healing room, herbal bowl, bronze medical tool, patient cot silhouette, gentle near-viewer gaze. |
| pythagoras | celebrity | `/logos/celebrity/pythagoras.png` | generated and connected | Greek teaching courtyard, triangle model, compass, counting stones, monochord string instrument, rightward student gaze. |
| nightingale | celebrity | `/logos/celebrity/nightingale.png` | generated and connected | 19th-century hospital ward, lamp, clipboard, nursing tray, clean beds, abstract statistics papers, patient-bed gaze. |
| freud | celebrity | `/logos/celebrity/freud.png` | generated and connected | Early psychoanalysis study, couch, armchair, notebook, bookshelves, abstract mind-map cues, unseen-patient leftward gaze. |
| adam-smith | celebrity | `/logos/celebrity/adam-smith.png` | generated and connected | Enlightenment study, market window, coins, balance scale, blank manuscript, abstract economics curves, outward gesture. |
| rousseau | celebrity | `/logos/celebrity/rousseau.png` | generated and connected | Lakeside garden, blank manuscript, quill, peaceful civic discussion silhouettes, upward-right nature gaze. |
| gutenberg | celebrity | `/logos/celebrity/gutenberg.png` | generated and connected | 15th-century print workshop, wooden press, movable type trays, ink tools, blank paper stacks, press-mechanism gaze. |
| helen-keller | celebrity | `/logos/celebrity/helen-keller.png` | generated and connected | Early classroom study, raised-dot tactile board, blank book, writing slate, hand-spelling cue, upward-left determined gaze. |
| musk | celebrity | `/logos/celebrity/musk.png` | generated and connected | Bright future-tech engineering studio, rocket prototype, electric vehicle silhouette, robot arm, abstract non-text panels, rightward prototype gaze. |
| buffett | celebrity | `/logos/celebrity/buffett.png` | generated and connected | Warm value-investing office, blank reports, magnifying glass, abstract charts, direct calm gaze; avoided newspaper text and brand/currency marks. |
| bezos | celebrity | `/logos/celebrity/bezos.png` | generated and connected | High-tech logistics and space operations room, unmarked parcel box, rocket model, robotics silhouettes, rightward prototype gaze without brand logos. |
| gates | celebrity | `/logos/celebrity/gates.png` | generated and connected | Sunlit tech-library lab, vintage computer, abstract screens, health philanthropy props, viewer-facing gesture without logos or readable screen text. |
| miyazaki | celebrity | `/logos/celebrity/miyazaki.png` | generated and connected | Bright animation studio, blank storyboard frames, light table, pencils, model airplane, upward studio gaze without copied characters or studio marks. |
| nolan | celebrity | `/logos/celebrity/nolan.png` | generated and connected | Film set control area, cinema camera, blank clapperboard, director monitor with abstract frames, viewer-facing directing gesture and no movie marks. |
| dalio | celebrity | `/logos/celebrity/dalio.png` | generated and connected | Macro investing research room, cause-and-effect cards, economic cycle tokens, abstract charts, leftward strategy gaze without tickers or logos. |
| jensen | celebrity | `/logos/celebrity/jensen.png` | generated and connected | Bright AI hardware lab, black leather jacket, abstract GPU module, server racks, neural network dots, chip-assembly pose without equipment labels. |
| zuckerberg | celebrity | `/logos/celebrity/zuckerberg.png` | generated and connected | Startup product studio, blank social graph display, VR headset, laptop with abstract blocks, viewer-facing gesture without app icons or sticky-note text. |
| zhuge-liang | celebrity | `/logos/celebrity/zhuge-liang.png` | generated and connected | Ancient command pavilion, feather fan, blank tactical map, troop tokens, mountains and symbol-free banners, composed strategist pose. |
| sherlock | fictional | `/logos/character/sherlock.png` | generated and connected | Victorian detective study, magnifying glass, clue table, gas lamp, London fog, near-viewer investigative pose without readable evidence text. |
| dracula | fictional | `/logos/character/dracula.png` | generated and connected | Elegant gothic castle library, high-collar cloak, candle, moonlit arches, bat silhouettes, direct aristocratic gaze without gore or book text. |
| frankenstein | fictional | `/logos/character/frankenstein.png` | generated and connected | Sympathetic laboratory creature, subtle bolts, storm-lit lab, brass electrical machine, glowing coil hand focus without labels or gore. |
| alice | fictional | `/logos/character/alice.png` | generated and connected | Whimsical garden room, blue dress and apron, small key, tiny door, teacup, rabbit cue, upward wonder gaze without readable cards or pages. |
| donquixote | fictional | `/logos/character/donquixote.png` | generated and connected | Sunny La Mancha scene, patched armor, lance, horse silhouette, distant windmills, brave leftward gaze with clear chivalric cues. |
| tarzan | fictional | `/logos/character/tarzan.png` | generated and connected | Sunlit jungle canopy, vine grip, waterfall, rugged adventurer posture, rightward scanning gaze with no modern film cues. |
| scrooge | fictional | `/logos/character/scrooge.png` | generated and connected | Victorian counting room, candle, plain coin purse, fireplace glow, winter window and ghostly light cue; regenerated to remove clock/dial numbers. |
| robinson-crusoe | fictional | `/logos/character/robinson-crusoe.png` | generated and connected | Tropical island survival scene, hut, salvaged chest, tool, horizon sail gaze and no crate/map markings. |
| tom-sawyer | fictional | `/logos/character/tom-sawyer.png` | generated and connected | Sunny river-town fence-painting scene, straw hat, brush and bucket, sideways mischievous gaze without signs or labels. |
| jekyll-hyde | fictional | `/logos/character/jekyll-hyde.png` | generated and connected | Split-light Victorian laboratory, vial, mirror alter ego, direct tense gaze; regenerated to remove clock/landmark text risk. |
| wukong | fictional | `/logos/character/wukong.png` | generated and connected | Mountain cloud myth scene, golden headband, staff, peach tree cue, dynamic crouched viewer-facing pose without characters or banners. |
| robin-hood | fictional | `/logos/character/robin-hood.png` | generated and connected | Sunlit forest outlaw archer, green hood, bow and quiver, helping gesture, distant castle road and leftward gaze. |
| king-arthur | fictional | `/logos/character/king-arthur.png` | generated and connected | Sunlit stone hall, crown, upright sword, round table, abstract stained glass and upward-right resolute gaze. |
| pinocchio | fictional | `/logos/character/pinocchio.png` | improved local composite connected | Built-in image generation continued to block this specific motif, so the prior icon-like/browser-rendered substitute was replaced with a style-matched raster composite based on the existing bright semi-real anime `tom-sawyer` card: long carved wooden nose, subtle feather/strings/joint cues, no text/logos, 16:9 PNG. This is the best available project-local substitute without falling back to the old public-domain illustration style. |
| sinbad | fictional | `/logos/character/sinbad.png` | generated and connected | Bright sailing ship deck, turbaned seafarer, astrolabe, rope, ocean horizon point and unmarked sails/chest. |
| aladdin | fictional | `/logos/character/aladdin.png` | generated and connected | Rooftop bazaar terrace, brass lamp, palace silhouette, warm sunset, direct confident gaze without script or modern film cues. |
| red-riding-hood | fictional | `/logos/character/red-riding-hood.png` | generated and connected | Bright forest path, red hood, wicker basket, cottage and distant wolf-shadow cue, cautious leftward gaze. |
| gatsby | fictional | `/logos/character/gatsby.png` | generated and connected | 1920s mansion party balcony, cream suit, champagne coupe, distant green light, over-shoulder longing gaze without labels. |
| valjean | fictional | `/logos/character/valjean.png` | generated and connected | Hopeful old French street, bread, silver candlestick, protective interaction pose, dawn light and no signs. |
| hamlet | fictional | `/logos/character/hamlet.png` | generated and connected | Castle battlement theater mood, dark prince, skull, lowered rapier, object-focused conflicted gaze without book text. |
| faust | fictional | `/logos/character/faust.png` | generated and connected | Renaissance scholar study, blank bargain parchment, quill, mirror shadow, alchemy glassware and dramatic split lighting. |
| peter-pan | fictional | `/logos/character/peter-pan.png` | generated and connected | Airborne island adventure scene, green outfit, fairy-dust glow, distant pirate ship, rightward joyful gaze without sail markings. |
| gulliver | fictional | `/logos/character/gulliver.png` | generated and connected | Beach scene with giant traveler and tiny townspeople, miniature ships and scale contrast, gentle downward interaction gaze. |
| lupin | fictional | `/logos/character/lupin.png` | generated and connected | Paris rooftop gentleman thief, top hat, gloves, monocle, jewel case and direct clever hush gesture without museum labels. |
| wonka | fictional | `/logos/character/wonka.png` | generated and connected | Bright candy workshop, colorful coat and tall hat, copper ladle, tray of sweets, chocolate pipes with no jar labels. |
| big-brother | fictional | `/logos/character/big-brother.png` | generated and connected | Futuristic surveillance control room, central authoritarian screen figure, blank monitor wall, command gesture and no slogans. |
| little-prince | fictional | `/logos/character/little-prince.png` | generated and connected | Tiny planet traveler, scarf, rose under glass, telescope, planets and poetic dawn space sky without copying original illustration. |
| korean | region | `/logos/region/korean.png` | generated and connected | Hanok courtyard, tea table, side dishes, Seoul skyline and mountain cue, welcoming direct gaze without Korean text or flags. |
| japanese | region | `/logos/region/japanese.png` | generated and connected | Machiya street, tea bowl, bonsai, bento cue, cherry blossoms and Tokyo skyline hint, rightward craft pose without Japanese text. |
| chinese | region | `/logos/region/chinese.png` | generated and connected | Regenerated for age/gender variety; moon gate garden, porcelain tea, dim sum steamer, bamboo and skyline cue without Chinese text. |
| american | region | `/logos/region/american.png` | generated and connected | Community street table, denim jacket, diner cup, barbecue picnic, basketball hoop, skyline and national-park cue without flags/text. |
| british | region | `/logos/region/british.png` | generated and connected | Regenerated for age/gender variety; rainy brick street, tea and scones, bus/taxi silhouettes and gothic architecture without numbers/text. |
| german | region | `/logos/region/german.png` | generated and connected | Regenerated to remove text-like marks; half-timbered town, modern glass dome/tower silhouettes, pretzel, coffee, bicycle and engineering model. |
| french | region | `/logos/region/french.png` | generated and connected | Outdoor cafe, scarfed art guide, blank sketchbook, croissant, flower stall, bicycle and Paris-like architecture without menus/signs. |
| indian | region | `/logos/region/indian.png` | generated and connected | Chai, spice bowls, thali, marigolds, carved arch and stepwell/temple-inspired background without script or signs. |
| brazilian | region | `/logos/region/brazilian.png` | generated and connected | Coastal city, tropical plants, percussion, fruit, coffee and soccer cue, upward-right energetic pose without carnival stereotype. |
| australian | region | `/logos/region/australian.png` | generated and connected | Harbor sails/bridge, eucalyptus, surfboard, barbecue plate and outback art panel without text or surfboard logos. |
| canadian | region | `/logos/region/canadian.png` | generated and connected | Lakeside pine forest, snowy mountains, canoe, maple leaves, hockey stick, skyline across water and direct mug-holding pose. |
| thai | region | `/logos/region/thai.png` | generated and connected | Regenerated to remove boat markings; riverside food/flower table, jasmine garlands, temple roofs, longtail boat and market baskets. |
| vietnamese | region | `/logos/region/vietnamese.png` | generated and connected | Regenerated to reduce license-plate risk; ao-dai-inspired tunic, conical hat, pho, iced coffee, lotus, Hanoi-like balconies and rice terrace cue. |
| russian | region | `/logos/region/russian.png` | generated and connected | Regenerated to remove text-like books/dolls; winter tea table, samovar, onion-dome silhouettes, birch trees and ballet slippers. |
| mexican | region | `/logos/region/mexican.png` | generated and connected | Food-and-craft table, clay mug, marigolds, tacos, woven textiles, agave, colonial arches and desert mountain cue. |
| nigerian | region | `/logos/region/nigerian.png` | generated and connected | Lagos-like skyline, textile table, jollof rice, carved craft, music headphones and tropical plants with no signs/logos. |
| italian | region | `/logos/region/italian.png` | generated and connected | Sunlit trattoria courtyard, handmade pasta, espresso, olive oil, stone alley, scooter silhouette and Tuscan hills. |
| spanish | region | `/logos/region/spanish.png` | generated and connected | Mediterranean plaza, tapas, guitar, paella pan, olives, Moorish arch patterns, orange trees and coastal rooftops. |
| turkish | region | `/logos/region/turkish.png` | generated and connected | Istanbul-like waterfront, tea glass, domes/minarets, bridge, baklava, copper coffee pot and ceramic tiles without lettering. |
| saudi | region | `/logos/region/saudi.png` | generated and connected | Modern Riyadh-like skyline, desert dunes, dates, brass coffee pot, geometric screens and hospitality coffee gesture. |
| israeli | region | `/logos/region/israeli.png` | generated and connected | Mediterranean market/innovation table, pale stone arches, seaside skyline, hummus, olives/citrus and abstract tablet with no scripts. |
| filipino | region | `/logos/region/filipino.png` | generated and connected | Family food/craft table, barong-inspired shirt, island shoreline, Manila-like skyline, unmarked jeepney silhouette, adobo, mango and guitar. |
| indonesian | region | `/logos/region/indonesian.png` | generated and connected | Coffee-and-craft table, batik overshirt, rice terraces, temple gate, volcano, satay, gamelan shapes and woven baskets. |
| polish | region | `/logos/region/polish.png` | generated and connected | Cozy market table, pierogi, amber craft, old town facades, church towers, folk floral cut-paper shapes and cool seasonal light. |
| swedish | region | `/logos/region/swedish.png` | generated and connected | Bright design studio kitchen, fika coffee, cinnamon buns, minimalist wood furniture, waterfront/archipelago and bicycle cues. |
| egyptian | region | `/logos/region/egyptian.png` | generated and connected | Regenerated to remove hieroglyph/text risk; Nile tea table, smooth columns, pyramid silhouettes, dates and Cairo-like skyline. |
| argentinian | region | `/logos/region/argentinian.png` | generated and connected | Cafe/music table, mate gourd, Buenos Aires-like balconies, tango shoes, empanadas, guitar and Andes artwork. |
| southafrican | region | `/logos/region/southafrican.png` | generated and connected | Table Mountain/coastal city cue, community food-and-craft table, braai plate, beadwork, protea, surfboard and vineyard hills. |
| taiwanese | region | `/logos/region/taiwanese.png` | generated and connected | Regenerated to remove market sign/text risk; bubble tea, xiaolongbao, oolong tea, Taipei-like skyline and mountain foothills. |
| singaporean | region | `/logos/region/singaporean.png` | generated and connected | Regenerated for age/gender variety and no signs; garden-city skyline, food table, transit silhouette and waterfront promenade. |
| malaysian | region | `/logos/region/malaysian.png` | generated and connected | Food-and-garden table, batik-inspired shirt, nasi lemak, twin-tower silhouettes, rainforest plants, teh tarik and island-water cue. |
| dutch | region | `/logos/region/dutch.png` | generated and connected | Canal-side flower table, tulips, bicycle, bridge, canal houses, cheese wheel and distant windmill with cloudy daylight. |
| swiss | region | `/logos/region/swiss.png` | generated and connected | Regenerated to remove cross/numeral risk; Alps, chalet rooftops, plain mountain train, fondue, chocolate and unlabeled gears. |
| norwegian | region | `/logos/region/norwegian.png` | generated and connected | Fjord-side deck, wool sweater, thermos, red cabin, fishing boat, salmon dish and soft northern-light sky. |
| colombian | region | `/logos/region/colombian.png` | generated and connected | Coffee-and-flower table, Andean mountains, coffee plants, colonial balconies, arepa plate and woven mochila cue. |
| chilean | region | `/logos/region/chilean.png` | generated and connected | Andes peaks, Pacific coastline cliffs, vineyard rows, observatory dome, seafood plate and desert wildflowers. |
| iranian | region | `/logos/region/iranian.png` | generated and connected | Persian garden tea table, geometric tile arches, pomegranate, saffron tea, woven carpet edge and blank poetry notebook. |
| emirati | region | `/logos/region/emirati.png` | generated and connected | Modern abstract skyline, desert dunes, dates, brass coffee pot, falcon perch silhouette and hospitality gesture. |
| pakistani | region | `/logos/region/pakistani.png` | generated and connected | Karakoram peaks, Lahore-like garden arch, abstract truck-art patterns, biryani, chai, cricket bat and embroidered fabric. |
| bangladeshi | region | `/logos/region/bangladeshi.png` | generated and connected | Delta river, unmarked wooden boats, rice fields, jamdani textile, hilsa dish, tea leaves and Dhaka-like skyline. |
| newzealander | region | `/logos/region/newzealander.png` | generated and connected | Green mountains, fjord-like lake, black-sand beach, fern leaves, Maori-inspired abstract panel, sheep and kiwi cues. |
| irish | region | `/logos/region/irish.png` | generated and connected | Regenerated to remove book-spine text risk; green hills, stone cottage, coastal cliffs, harp, fiddle, tea and soda bread. |
| greek | region | `/logos/region/greek.png` | generated and connected | Whitewashed island houses, Aegean sea, olive branches, ancient columns, feta/olives plate and fishing boat. |
| czech | region | `/logos/region/czech.png` | generated and connected | Prague-like bridge/castle silhouettes, crystal craft, kolache plate, puppet theater masks, river reflection and autumn light. |
| eastasian-culture | region | `/logos/region/eastasian-culture.png` | generated and connected | Cross-regional East Asian guide, tea/craft table, modern skyline, courtyard rooflines, bamboo/pine, moon gate, blank brush paper and steamer basket. |
| middleeast-culture | region | `/logos/region/middleeast-culture.png` | generated and connected | Regenerated to remove calligraphy-like marks; older woman guide, desert/palm courtyard, stone arches, abstract skyline, dates, flatbread and plain brass pot. |
| western | region | `/logos/region/western.png` | generated and connected | Regenerated to remove book/camera text risk; civic cafe table, classical columns, glass skyline, university courtyard, tram/bicycle silhouettes and plain globe. |
| latin | region | `/logos/region/latin.png` | generated and connected | Music-and-food plaza table, woven jacket, guitar/percussion, coffee, citrus, empanada/tapas plate, colonial arches and tiled courtyard. |
| nordic | region | `/logos/region/nordic.png` | generated and connected | Regenerated to remove book text risk; fjord/pine forest, cabin, archipelago, coffee, cinnamon buns, minimalist furniture and knitted blanket. |
| african | region | `/logos/region/african.png` | generated and connected | Cross-regional African guide, modern skyline, market canopy, geometric textiles, carved craft, grain bowl, coffee pot, baobab and savanna/coast cue. |
| southeast-asian-culture | region | `/logos/region/southeast-asian-culture.png` | generated and connected | River delta, rice terraces, stilt houses, temple roof silhouettes, longtail boat, tropical fruit, satay, noodle bowl and woven baskets. |
| southamerican-culture | region | `/logos/region/southamerican-culture.png` | generated and connected | Andes, Amazon edge, coastal skyline, coffee plants, mate gourd, tropical fruit, textiles, pan flute/guitar and empanada/arepa plate. |
