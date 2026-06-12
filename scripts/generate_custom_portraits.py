from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUT_DIRS = [ROOT / "public" / "logos" / "occupation", ROOT / "public" / "logos" / "specialist"]
SIZE = (640, 360)


PALETTES = {
    "medical": ("#eef7fb", "#62a6c6", "#ffffff", "#253044"),
    "law": ("#f7f0e8", "#c69a62", "#20242d", "#2d2a28"),
    "finance": ("#eff8f3", "#3eaa72", "#203026", "#272a2e"),
    "education": ("#f4f7ed", "#86a965", "#f4ead6", "#6a3f2b"),
    "creative": ("#fbf1f6", "#c96d94", "#ffffff", "#3b2d31"),
    "tech": ("#eef4fb", "#5f83cf", "#1f2937", "#252b38"),
    "field": ("#f6f1e8", "#b98752", "#2e3a2f", "#2c2a28"),
    "science": ("#eef7f5", "#4ba9a2", "#ffffff", "#30303a"),
    "public": ("#f2f4fb", "#6178be", "#263246", "#2c3038"),
    "culture": ("#f5effb", "#8b6fc6", "#44384f", "#4f3d36"),
}


ROLE_STYLE = {
    "doctor": ("medical", "male", "clinic", "stethoscope"),
    "pharmacist": ("medical", "female", "pharmacy", "bottles"),
    "vet": ("medical", "male", "clinic", "pet"),
    "counselor": ("science", "female", "office", "chat"),
    "medical": ("medical", "female", "clinic", "stethoscope"),
    "psychology": ("culture", "female", "office", "chat"),
    "judge": ("law", "male", "court", "scales"),
    "lawyer": ("law", "female", "court", "briefcase"),
    "legal": ("law", "male", "court", "scales"),
    "accountant": ("finance", "male", "office", "chart"),
    "taxadvisor": ("finance", "male", "office", "chart"),
    "stocktrader": ("finance", "male", "office", "chart"),
    "finance": ("finance", "female", "office", "chart"),
    "teacher": ("education", "female", "classroom", "books"),
    "education": ("education", "female", "classroom", "books"),
    "writer": ("creative", "female", "studio", "pen"),
    "artist": ("creative", "female", "studio", "palette"),
    "designer": ("creative", "female", "studio", "palette"),
    "journalist": ("creative", "male", "studio", "pen"),
    "musician": ("creative", "female", "studio", "music"),
    "comedian": ("creative", "male", "stage", "mic"),
    "producer": ("creative", "male", "studio", "camera"),
    "programmer": ("tech", "male", "office", "code"),
    "engineer": ("tech", "male", "lab", "gear"),
    "architect": ("tech", "male", "studio", "blueprint"),
    "gamedev": ("tech", "male", "office", "code"),
    "compsci": ("tech", "male", "office", "code"),
    "scientist": ("science", "female", "lab", "flask"),
    "physics": ("science", "male", "lab", "atom"),
    "chemistry": ("science", "female", "lab", "flask"),
    "biology": ("science", "female", "lab", "leaf"),
    "earthscience": ("science", "male", "lab", "earth"),
    "envscience": ("science", "female", "lab", "leaf"),
    "chef": ("field", "male", "kitchen", "chef"),
    "barista": ("field", "female", "cafe", "cup"),
    "farmer": ("field", "male", "field", "leaf"),
    "fisher": ("field", "male", "field", "wave"),
    "miner": ("field", "male", "field", "helmet"),
    "pilot": ("public", "male", "airport", "wings"),
    "flightcrew": ("public", "female", "airport", "wings"),
    "firefighter": ("public", "male", "station", "shield"),
    "police": ("public", "male", "station", "shield"),
    "soldier": ("public", "male", "station", "shield"),
    "bodyguard": ("public", "male", "station", "shield"),
    "diplomat": ("public", "male", "office", "briefcase"),
    "socialworker": ("public", "female", "office", "chat"),
    "sailor": ("public", "male", "field", "wave"),
    "athlete": ("field", "male", "field", "medal"),
    "hairstylist": ("creative", "female", "studio", "scissors"),
    "model": ("creative", "female", "studio", "spark"),
    "sommelier": ("field", "female", "cafe", "glass"),
    "detective": ("law", "male", "office", "lens"),
    "history": ("culture", "male", "archive", "scroll"),
    "philosophy": ("culture", "male", "archive", "column"),
    "theology": ("culture", "male", "archive", "book"),
    "economics": ("finance", "male", "office", "chart"),
    "sociology": ("public", "female", "office", "network"),
    "political": ("public", "male", "office", "podium"),
    "sports": ("field", "male", "field", "medal"),
    "marketing": ("creative", "female", "studio", "megaphone"),
    "criminology": ("law", "female", "office", "lens"),
    "pubadmin": ("public", "male", "office", "building"),
    "military": ("public", "male", "station", "shield"),
    "intlrelations": ("public", "female", "office", "globe"),
    "astronomy": ("culture", "female", "lab", "stars"),
}


def hex_to_rgb(value: str) -> tuple[int, int, int]:
    value = value.lstrip("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))


def soften(color: str, amount: float = 0.5) -> tuple[int, int, int]:
    r, g, b = hex_to_rgb(color)
    return (
        int(r + (255 - r) * amount),
        int(g + (255 - g) * amount),
        int(b + (255 - b) * amount),
    )


def rounded(draw: ImageDraw.ImageDraw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def line(draw: ImageDraw.ImageDraw, xy, fill, width=4):
    draw.line(xy, fill=fill, width=width, joint="curve")


def draw_background(draw: ImageDraw.ImageDraw, accent: str, bg: str, scene: str):
    draw.rectangle((0, 0, SIZE[0], SIZE[1]), fill=soften(bg, 0.25))
    for y in range(SIZE[1]):
        t = y / SIZE[1]
        c = tuple(int(soften(bg, 0.08)[i] * (1 - t) + 255 * t) for i in range(3))
        draw.line((0, y, SIZE[0], y), fill=c)

    rounded(draw, (34, 34, 606, 252), 38, (255, 255, 255, 95))
    for x in (70, 104, 138):
        rounded(draw, (x, 64, x + 70, 76), 6, (255, 255, 255, 170))
    for i, x in enumerate((450, 485, 520)):
        rounded(draw, (x, 98 - i * 7, x + 18, 160), 7, soften(accent, 0.35))
    draw.rectangle((0, 252, SIZE[0], SIZE[1]), fill=(255, 255, 255, 115))

    if scene in {"pharmacy", "archive", "classroom"}:
        for row in range(3):
            y = 72 + row * 45
            line(draw, (388, y, 574, y), fill=soften(accent, 0.58), width=3)
            for col in range(7):
                rounded(draw, (398 + col * 24, y - 22, 414 + col * 24, y - 4), 4, soften(accent, 0.42))
    if scene in {"court", "studio"}:
        line(draw, (430, 70, 430, 178), fill=soften(accent, 0.5), width=5)
        line(draw, (492, 70, 492, 178), fill=soften(accent, 0.5), width=5)
        line(draw, (414, 70, 508, 70), fill=soften(accent, 0.45), width=6)
    if scene in {"clinic", "lab"}:
        rounded(draw, (410, 70, 560, 190), 22, (255, 255, 255, 118), outline=soften(accent, 0.62), width=2)
        line(draw, (444, 128, 526, 128), fill=soften(accent, 0.45), width=4)
        line(draw, (485, 88, 485, 168), fill=soften(accent, 0.45), width=4)
    if scene in {"office", "airport", "station"}:
        rounded(draw, (386, 72, 574, 186), 20, (255, 255, 255, 125))
        for n in range(4):
            rounded(draw, (410, 96 + n * 20, 540 - n * 18, 105 + n * 20), 5, soften(accent, 0.42))
    if scene in {"field", "cafe", "kitchen"}:
        for n in range(10):
            x = 390 + n * 18
            line(draw, (x, 190, x + 8, 152 - (n % 3) * 13), fill=soften(accent, 0.48), width=3)


def draw_prop(draw: ImageDraw.ImageDraw, prop: str, accent: str):
    a = hex_to_rgb(accent)
    if prop in {"stethoscope", "lens"}:
        line(draw, (214, 214, 230, 270, 250, 270), fill=a, width=5)
        draw.ellipse((242, 262, 266, 286), outline=a, width=5)
    elif prop in {"pet"}:
        draw.ellipse((415, 188, 475, 252), fill=(197, 143, 80))
        draw.ellipse((405, 180, 430, 208), fill=(157, 104, 62))
        draw.ellipse((460, 180, 486, 208), fill=(157, 104, 62))
        draw.ellipse((434, 210, 440, 216), fill=(45, 35, 30))
        draw.ellipse((454, 210, 460, 216), fill=(45, 35, 30))
        draw.arc((434, 220, 458, 238), 10, 170, fill=(85, 55, 45), width=3)
    elif prop in {"scales"}:
        line(draw, (420, 95, 500, 95), fill=a, width=5)
        line(draw, (460, 88, 460, 178), fill=a, width=5)
        line(draw, (430, 100, 412, 142), fill=a, width=3)
        line(draw, (490, 100, 508, 142), fill=a, width=3)
        draw.arc((398, 136, 432, 168), 0, 180, fill=a, width=4)
        draw.arc((492, 136, 526, 168), 0, 180, fill=a, width=4)
    elif prop in {"chart"}:
        for i, h in enumerate((38, 68, 52, 86)):
            rounded(draw, (420 + i * 28, 178 - h, 438 + i * 28, 178), 5, soften(accent, 0.22))
    elif prop in {"code"}:
        line(draw, (410, 128, 386, 152, 410, 176), fill=a, width=6)
        line(draw, (502, 128, 526, 152, 502, 176), fill=a, width=6)
        line(draw, (448, 182, 470, 122), fill=soften(accent, 0.05), width=5)
    elif prop in {"flask"}:
        line(draw, (455, 96, 455, 138, 426, 190, 488, 190, 459, 138), fill=a, width=5)
        draw.arc((432, 150, 482, 200), 0, 180, fill=soften(accent, 0.1), width=5)
    elif prop in {"books", "book", "scroll"}:
        for i, color in enumerate((a, soften(accent, 0.28), soften(accent, 0.42))):
            rounded(draw, (405 + i * 42, 130 - i * 8, 438 + i * 42, 196), 5, color)
    elif prop in {"palette"}:
        draw.ellipse((408, 118, 510, 196), fill=soften(accent, 0.22))
        draw.ellipse((450, 144, 474, 166), fill=(255, 255, 255))
        for x, y, c in ((432, 140, "#e76f51"), (468, 130, "#f4a261"), (488, 160, "#2a9d8f")):
            draw.ellipse((x, y, x + 16, y + 16), fill=hex_to_rgb(c))
    else:
        rounded(draw, (412, 116, 516, 190), 24, (255, 255, 255, 125), outline=soften(accent, 0.45), width=3)
        draw.ellipse((452, 138, 476, 162), fill=a)


def draw_person(draw: ImageDraw.ImageDraw, gender: str, outfit: str, hair: str, accent: str):
    skin = (238, 192, 155)
    dark = hex_to_rgb(hair)
    outfit_rgb = hex_to_rgb(outfit)
    a = hex_to_rgb(accent)

    # soft contact shadow and broad upper-body silhouette
    draw.ellipse((172, 312, 468, 358), fill=(40, 50, 70, 18))
    draw.pieslice((165, 188, 475, 500), 180, 360, fill=tuple(max(0, c - 8) for c in outfit_rgb))
    draw.polygon([(190, 360), (214, 248), (288, 218), (320, 282), (352, 218), (426, 248), (450, 360)], fill=outfit_rgb)
    draw.polygon([(258, 232), (320, 354), (382, 232), (352, 224), (320, 290), (288, 224)], fill=(255, 255, 255, 222))
    line(draw, (320, 264, 320, 350), fill=a, width=12)
    # neck
    rounded(draw, (294, 200, 346, 260), 24, skin)
    # hair back
    if gender == "female":
        draw.ellipse((238, 54, 402, 238), fill=dark)
        rounded(draw, (240, 138, 300, 280), 26, dark)
        rounded(draw, (340, 138, 400, 280), 26, dark)
    else:
        draw.pieslice((236, 54, 404, 222), 180, 360, fill=dark)
    # face
    draw.ellipse((244, 76, 396, 238), fill=skin)
    draw.ellipse((268, 108, 372, 224), fill=(246, 205, 170, 78))
    # hair front
    if gender == "female":
        draw.pieslice((244, 56, 396, 168), 178, 360, fill=dark)
        draw.polygon([(252, 130), (326, 54), (392, 132), (378, 88), (312, 52)], fill=dark)
    else:
        draw.pieslice((238, 50, 402, 156), 180, 360, fill=dark)
        draw.polygon([(246, 118), (302, 50), (402, 120), (386, 78), (298, 48)], fill=dark)
    # ears
    draw.ellipse((230, 140, 260, 184), fill=skin)
    draw.ellipse((380, 140, 410, 184), fill=skin)
    # features
    draw.ellipse((286, 154, 299, 168), fill=(38, 45, 55))
    draw.ellipse((341, 154, 354, 168), fill=(38, 45, 55))
    draw.arc((294, 178, 346, 214), 15, 165, fill=(176, 98, 86), width=5)
    # subtle cheek
    draw.ellipse((270, 172, 296, 188), fill=(232, 135, 126, 45))
    draw.ellipse((344, 172, 370, 188), fill=(232, 135, 126, 45))


def generate(path: Path, style):
    palette, gender, scene, prop = style
    bg, accent, outfit, hair = PALETTES[palette]
    img = Image.new("RGBA", SIZE, (255, 255, 255, 255))
    draw = ImageDraw.Draw(img, "RGBA")
    draw_background(draw, accent, bg, scene)
    draw_prop(draw, prop, accent)
    draw_person(draw, gender, outfit, hair, accent)
    img = img.filter(ImageFilter.UnsharpMask(radius=1.2, percent=90, threshold=3))
    img.save(path)


def main():
    generated = []
    for directory in OUT_DIRS:
        if not directory.exists():
            continue
        for path in sorted(directory.glob("*.png")):
            key = path.stem
            style = ROLE_STYLE.get(key)
            if not style:
                style = ("culture" if directory.name == "specialist" else "field", "female", "office", "spark")
            generate(path, style)
            generated.append(path.relative_to(ROOT).as_posix())
    print(f"generated {len(generated)} custom portrait assets")
    for item in generated[:12]:
        print(item)


if __name__ == "__main__":
    main()
