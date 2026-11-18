import unittest

from studio_gateway_contract import validate_studio_options


class StudioGatewayContractTests(unittest.TestCase):
    def test_studio_modes_accept_proven_text_edit_mask_and_inspiration_shapes(self):
        base = dict(prompt="A red glass vase", seed=42, width=1024, height=1024)
        validate_studio_options(**base)
        validate_studio_options(**base, has_inspiration=True, generate_vgl=True)
        validate_studio_options(**(base | {"source_count": 4, "width": 0, "height": 0}))
        validate_studio_options(**(base | {"source_count": 1, "has_mask": True, "width": 0, "height": 0}))
        validate_studio_options(**(base | {"source_count": 1, "vgl": '{"edit_instruction":"Make @image1 blue"}', "width": 0, "height": 0}))

    def test_contract_rejects_ambiguous_or_unsupported_combinations(self):
        base = dict(prompt="A red glass vase", seed=42, width=1024, height=1024)
        for changes in (
            {"has_inspiration": True, "source_count": 1},
            {"has_inspiration": True, "vgl": '{"short_description":"manual"}'},
            {"has_mask": True, "source_count": 2},
            {"generate_vgl": True, "vgl": '{"short_description":"manual"}'},
            {"source_count": 0, "width": 0, "height": 0},
            {"steps": 9},
        ):
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                validate_studio_options(**(base | changes))


if __name__ == "__main__":
    unittest.main()
