from odoo import fields, models


class ProductTemplate(models.Model):
    _inherit = 'product.template'

    is_vision_lens = fields.Boolean(
        string='Vision Lens',
        help='Tick this for a lens that needs a left and right eye prescription. '
             'The Point of Sale will ask for that card each time the product is sold.',
    )

    def _load_pos_data_fields(self, config):
        field_names = super()._load_pos_data_fields(config)
        if 'is_vision_lens' not in field_names:
            field_names.append('is_vision_lens')
        return field_names
