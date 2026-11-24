from odoo.exceptions import UserError
from odoo.tests import tagged
from odoo.tools import float_compare

from odoo.addons.point_of_sale.tests.common import CommonPosTest


@tagged('post_install', '-at_install')
class TestPosRestrictNegativeSale(CommonPosTest):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.pos_config = cls.pos_config_usd
        cls.pos_config.restrict_negative_sale = True
        cls.location = cls.pos_config.picking_type_id.default_location_src_id
        cls.candle = cls.env['product.product'].create({
            'name': 'Shelf Candle',
            'is_storable': True,
            'available_in_pos': True,
            'list_price': 12.0,
            'taxes_id': False,
        })

    def _set_on_hand(self, product, qty):
        quant = self.env['stock.quant'].search([
            ('product_id', '=', product.id),
            ('location_id', '=', self.location.id),
        ], limit=1)
        if not quant:
            quant = self.env['stock.quant'].create({
                'product_id': product.id,
                'location_id': self.location.id,
            })
        quant.inventory_quantity = qty
        quant.action_apply_inventory()

    def test_free_qty_is_read_from_the_shop_location(self):
        self._set_on_hand(self.candle, 0)
        zero = self.env['product.product'].get_pos_free_qty([self.candle.id], self.pos_config.id)
        self.assertEqual(zero[str(self.candle.id)], 0)

        self._set_on_hand(self.candle, 4)
        four = self.env['product.product'].get_pos_free_qty([self.candle.id], self.pos_config.id)
        self.assertEqual(four[str(self.candle.id)], 4)

    def test_payment_is_refused_when_the_line_exceeds_stock(self):
        self._set_on_hand(self.candle, 1)
        self.pos_config.open_ui()
        session = self.pos_config.current_session_id
        order = self.env['pos.order'].create({
            'session_id': session.id,
            'company_id': self.env.company.id,
            'amount_tax': 0,
            'amount_total': 24,
            'amount_paid': 0,
            'amount_return': 0,
            'lines': [(0, 0, {
                'name': 'Shelf Candle',
                'product_id': self.candle.id,
                'qty': 2,
                'price_unit': 12,
                'price_subtotal': 24,
                'price_subtotal_incl': 24,
            })],
        })
        with self.assertRaises(UserError):
            order._pos_check_negative_sale()

        self._set_on_hand(self.candle, 2)
        order._pos_check_negative_sale()
        self.assertTrue(float_compare(self.candle.with_context(location=self.location.id).free_qty, 2, precision_rounding=0.01) >= 0)
