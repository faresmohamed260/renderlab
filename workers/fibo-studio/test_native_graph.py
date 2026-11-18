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

    def test_edit_graph_preserves_reference_slots_and_vgl(self):
        vgl = '{"edit_instruction":"Change the coat"}'
        graph = build_graph(prompt="", seed=0, images=["a" * 32 + ".png", "b" * 32 + ".png"], vgl=vgl)
        self.assertEqual(graph["encode"]["inputs"]["prompt"], vgl)
        self.assertEqual(graph["encode"]["inputs"]["images.image_1"], ["image_1", 0])
        self.assertEqual(graph["encode"]["inputs"]["images.image_2"], ["image_2", 0])

    def test_unsupported_or_unbounded_input_fails_closed(self):
        for args in (
            {"mask": b"mask"}, {"images": ["../source.png"]}, {"steps": 9},
            {"width": 1280}, {"width": 1536, "height": 1536}, {"seed": True},
            {"vgl": "[]"}, {"prompt": ""},
        ):
            with self.subTest(args=args), self.assertRaises(ValueError):
                build_graph(**({"prompt": "Test", "seed": 42} | args))


if __name__ == "__main__":
    unittest.main()
