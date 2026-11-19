import unittest

from native_graph import build_graph


class NativeGraphTests(unittest.TestCase):
    def test_text_graph_has_native_nodes_and_no_input_images(self):
        graph = build_graph(prompt="A studio portrait", seed=42, width=1280, height=720)
        self.assertEqual(graph["encode"]["class_type"], "TextEncodeFibo2")
        self.assertEqual(graph["encode"]["inputs"]["width"], 1280)
        self.assertEqual(graph["sample"]["inputs"]["latent_image"], ["encode", 2])
        self.assertEqual(graph["output"]["inputs"]["images"], ["decode", 0])
        self.assertEqual(len(graph), 7)

    def test_negative_prompt_cfg_matches_proven_wanda_studio_behavior(self):
        # WANDA comfy_backend.py (verified 2026-11-19) uses CFG 2 with a
        # negative prompt and 1 without; shipping the negative text with CFG 1
        # unconditionally was not parity with that Studio runtime.
        empty = build_graph(prompt="A red vase", seed=42, negative_prompt="")
        self.assertEqual(empty["sample"]["inputs"]["cfg"], 1.0)
        spaces = build_graph(prompt="A red vase", seed=42, negative_prompt="   ")
        self.assertEqual(spaces["sample"]["inputs"]["cfg"], 1.0)
        negative = build_graph(prompt="A red vase", seed=42, negative_prompt="No blue background")
        self.assertEqual(negative["sample"]["inputs"]["cfg"], 2.0)
        self.assertEqual(negative["encode"]["inputs"]["negative_prompt"], "No blue background")
        self.assertEqual(empty["sample"]["inputs"]["sampler_name"], negative["sample"]["inputs"]["sampler_name"])

    def test_edit_graph_preserves_reference_slots_and_vgl(self):
        vgl = '{"edit_instruction":"Change the coat"}'
        graph = build_graph(prompt="", seed=0, images=["a" * 32 + ".png", "b" * 32 + ".png"], vgl=vgl)
        self.assertEqual(graph["encode"]["inputs"]["prompt"], vgl)
        self.assertEqual(graph["encode"]["inputs"]["images.image_1"], ["image_1", 0])
        self.assertEqual(graph["encode"]["inputs"]["images.image_2"], ["image_2", 0])

    def test_masked_edit_uses_public_inpaint_nodes_and_preserves_source(self):
        source = "a" * 32 + ".png"
        mask = "b" * 32 + ".png"
        graph = build_graph(prompt="Paint the masked area yellow", seed=42,
                            images=[source], mask=mask, width=256, height=256, steps=1)
        self.assertEqual(graph["mask_image"]["inputs"]["image"], mask)
        self.assertEqual(graph["mask_channel"]["class_type"], "ImageToMask")
        self.assertEqual(graph["masked_latent"]["class_type"], "SetLatentNoiseMask")
        self.assertEqual(graph["sample"]["inputs"]["latent_image"], ["masked_latent", 0])
        self.assertEqual(graph["output"]["inputs"]["images"], ["masked_composite", 0])
        self.assertEqual(graph["masked_composite"]["inputs"]["destination"], ["source_scaled", 0])
        self.assertEqual(graph["masked_composite"]["inputs"]["mask"], ["mask_channel", 0])
        self.assertEqual(len(graph), 15)

    def test_mask_original_geometry_is_resolved_from_source(self):
        graph = build_graph(prompt="Edit original", seed=42, images=["a" * 32 + ".png"],
                            mask="b" * 32 + ".png", source_dimensions=(512, 512))
        self.assertEqual((graph["encode"]["inputs"]["width"], graph["encode"]["inputs"]["height"]),
                         (1024, 1024))
        self.assertEqual(graph["mask_scaled"]["inputs"]["width"], 1024)

    def test_unsupported_or_unbounded_input_fails_closed(self):
        for args in (
            {"mask": b"mask"}, {"mask": "b" * 32 + ".png"},
            {"mask": "../mask.png", "images": ["a" * 32 + ".png"]},
            {"mask": "b" * 32 + ".png", "images": ["a" * 32 + ".png", "c" * 32 + ".png"]},
            {"mask": "a" * 32 + ".png", "images": ["a" * 32 + ".png"], "width": 256, "height": 256},
            {"images": ["../source.png"]}, {"steps": 9},
            {"width": 1280}, {"width": 1536, "height": 1536}, {"seed": True},
            {"vgl": "[]"}, {"prompt": ""},
        ):
            with self.subTest(args=args), self.assertRaises(ValueError):
                build_graph(**({"prompt": "Test", "seed": 42} | args))


if __name__ == "__main__":
    unittest.main()
