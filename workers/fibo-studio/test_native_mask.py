import unittest
from io import BytesIO

from PIL import Image

from native_mask import normalize_mask_bytes


def encoded_mask(color, size=(2, 2)):
    image = Image.new("RGB", size, (color, color, color))
    destination = BytesIO()
    image.save(destination, format="PNG")
    return destination.getvalue()


class NativeMaskTests(unittest.TestCase):
    def test_binary_mask_threshold_and_nearest_resize(self):
        source = Image.new("RGB", (2, 2), (0, 0, 0))
        source.putpixel((1, 0), (9, 9, 9))
        source.putpixel((1, 1), (255, 255, 255))
        output = BytesIO()
        source.save(output, format="PNG")
        normalized = normalize_mask_bytes(output.getvalue(), (4, 4))
        with Image.open(BytesIO(normalized)) as result:
            self.assertEqual(result.size, (4, 4))
            self.assertEqual(result.getpixel((0, 0)), 0)
            self.assertEqual(result.getpixel((3, 0)), 255)
            self.assertEqual(result.getpixel((3, 3)), 255)
            self.assertEqual(result.getpixel((0, 3)), 0)

    def test_rejects_non_png_zero_size_empty_or_invalid_masks(self):
        valid = encoded_mask(255)
        for mask, size in (
            (None, (2, 2)), (b"", (2, 2)), (b"not PNG", (2, 2)),
            (b"\x89PNG\r\n\x1a\ncorrupt", (2, 2)),
            (encoded_mask(0), (2, 2)), (valid, (0, 1)),
            (valid, (4097, 1)), (valid, (4096, 4097)),
        ):
            with self.subTest(mask=type(mask), size=size), self.assertRaises((ValueError, OSError)):
                normalize_mask_bytes(mask, size)


if __name__ == "__main__":
    unittest.main()
