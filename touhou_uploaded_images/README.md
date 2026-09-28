# Touhou board game images

The 65 images in `images/` cover all 89 numbered image texture slots in the textureless game, plus Yuuka's sunflower effect. Multiple slots can share an image; the 18 former `card_art` slots now point to the matching original portraits. The browser can scale each portrait to fit the card, so there is no need for a separate folder of downscaled copies.

- `backgrounds/`: faction and character setting images.
- `icons/`: faction emblems.
- `portraits/`: character cutouts for both cards and card details.
- `effects/`: Yuuka's pixel sunflower.

`texture_slots.csv` maps each texture slot to its image. Upload the `images/` folder to your repository. This ZIP contains images and the mapping, not a textured game HTML; its texture slots must be wired to the mapped paths. CSS currently sets many card backgrounds to `contain`, which scales portraits to fit the card at display time. Original portrait bytes are preserved.

Kourindou adds seven portraits, including separate Satono and Mai cutouts shown side by side on their shared card.
