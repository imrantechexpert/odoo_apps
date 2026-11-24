from odoo import fields, models


class PosConfig(models.Model):
    _inherit = 'pos.config'

    restrict_negative_sale = fields.Boolean(
        string='Block out-of-stock sales',
        default=True,
        help='Stop the cashier from selling a product, or one of its variants, '
             'when the quantity left in this shop is zero or less. '
             'A quantity above what is left is blocked as well.',
    )
