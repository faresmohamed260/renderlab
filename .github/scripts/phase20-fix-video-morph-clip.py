from pathlib import Path

path = Path("src/features/create/create-workspace.tsx")
text = path.read_text()

old_image = '''                <AnimatePresence initial={false} mode="popLayout">\n                  {outputKind === "image" ? (\n                    <motion.div\n                      key="image-model"\n                      layout="position"\n                      data-create-motion="mode-control"\n                      className="shrink-0"\n                      initial={reduceMotion ? false : { opacity: 0, x: 6 }}\n                      animate={{ opacity: 1, x: 0 }}\n                      exit={reduceMotion ? undefined : { opacity: 0, x: -6 }}\n                      transition={contextTransition}\n                    >'''
new_image = '''                <AnimatePresence initial={false} mode="wait">\n                  {outputKind === "image" ? (\n                    <motion.div\n                      key="image-model"\n                      data-create-motion="mode-control"\n                      className="shrink-0"\n                      initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}\n                      animate={{ opacity: 1, scale: 1 }}\n                      exit={reduceMotion ? undefined : { opacity: 0, scale: 0.96 }}\n                      transition={contextTransition}\n                    >'''

old_video = '''                <AnimatePresence initial={false} mode="popLayout">\n                  {outputKind === "video" ? (\n                    <motion.div\n                      key="video-settings"\n                      layout="position"\n                      data-create-motion="mode-control"\n                      className="shrink-0"\n                      initial={reduceMotion ? false : { opacity: 0, x: 6 }}\n                      animate={{ opacity: 1, x: 0 }}\n                      exit={reduceMotion ? undefined : { opacity: 0, x: -6 }}\n                      transition={contextTransition}\n                    >'''
new_video = '''                <AnimatePresence initial={false} mode="wait">\n                  {outputKind === "video" ? (\n                    <motion.div\n                      key="video-settings"\n                      data-create-motion="mode-control"\n                      className="shrink-0"\n                      initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}\n                      animate={{ opacity: 1, scale: 1 }}\n                      exit={reduceMotion ? undefined : { opacity: 0, scale: 0.96 }}\n                      transition={contextTransition}\n                    >'''

for old, new, label in [(old_image, new_image, "image mode control"), (old_video, new_video, "video mode control")]:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one target, found {count}")
    text = text.replace(old, new, 1)

path.write_text(text)
