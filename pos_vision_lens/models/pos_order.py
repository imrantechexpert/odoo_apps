from markupsafe import Markup

from odoo import api, fields, models


class PosOrder(models.Model):
    _inherit = 'pos.order'

    # Kept off pos.order.line's order_id on purpose. The POS client allows only
    # one one2many inverse for that many2one, which is already pos.order.lines.
    vision_cards_html = fields.Html(
        string='Vision Prescriptions',
        compute='_compute_vision_cards_html',
        sanitize=False,
    )

    @api.depends(
        'lines.is_vision_lens',
        'lines.full_product_name',
        'lines.vision_right_sph', 'lines.vision_right_cyl', 'lines.vision_right_axis', 'lines.vision_right_va',
        'lines.vision_left_sph', 'lines.vision_left_cyl', 'lines.vision_left_axis', 'lines.vision_left_va',
        'lines.vision_advise',
        'lines.vision_signature',
    )
    def _compute_vision_cards_html(self):
        for order in self:
            cards = [
                line._vision_card_html()
                for line in order.lines
                if line.is_vision_lens
            ]
            order.vision_cards_html = Markup('').join(cards) if cards else False

    def _order_receipt_generate_line_data(self):
        lines = super()._order_receipt_generate_line_data()
        for line in lines:
            signature = line.get('vision_signature')
            if isinstance(signature, dict):
                line['vision_signature'] = signature.get('content') or False
        return lines
