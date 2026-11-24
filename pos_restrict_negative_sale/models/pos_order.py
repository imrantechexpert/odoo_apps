from odoo import _, models
from odoo.exceptions import UserError
from odoo.tools import float_compare


def _format_qty(qty):
    text = ('%f' % qty).rstrip('0').rstrip('.')
    return text or '0'


class PosOrder(models.Model):
    _inherit = 'pos.order'

    def _process_saved_order(self, draft):
        if not draft:
            self._pos_check_negative_sale()
        return super()._process_saved_order(draft)

    def _pos_check_negative_sale(self):
        """Refuse to pay an order that would sell more than the shop has."""
        for order in self:
            config = order.config_id
            if not config.restrict_negative_sale or order.is_refund:
                continue
            lines = order.lines.filtered(
                lambda line: line.qty > 0
                and not line.refunded_orderline_id
                and not line.combo_line_ids
                and line.product_id.is_storable
            )
            if not lines:
                continue
            qty_by_product = {}
            for line in lines:
                product = line.product_id
                qty_by_product[product] = qty_by_product.get(product, 0.0) + line.qty

            products = self.env['product.product'].browse([product.id for product in qty_by_product])
            # Serialize two cashiers paying for the last unit at the same time.
            self.env.cr.execute(
                "SELECT id FROM product_product WHERE id IN %s ORDER BY id FOR UPDATE",
                [tuple(products.ids)],
            )
            free_map = products._pos_free_qty_map(config)
            shortages = []
            for product, qty in qty_by_product.items():
                free_qty = free_map.get(product.id, 0.0)
                rounding = product.uom_id.rounding or 0.01
                if float_compare(qty, free_qty, precision_rounding=rounding) > 0:
                    shortages.append((product, qty, free_qty))
            if not shortages:
                continue
            details = '\n'.join(
                _('- %(name)s: selling %(qty)s, available %(free)s %(uom)s',
                  name=product.display_name,
                  qty=_format_qty(qty),
                  free=_format_qty(free_qty),
                  uom=product.uom_id.name or '')
                for product, qty, free_qty in shortages
            )
            raise UserError(_(
                "This order would sell more than you have in stock.\n\n%s",
                details,
            ))
