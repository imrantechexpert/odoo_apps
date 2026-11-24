from odoo import api, models


class ProductProduct(models.Model):
    _inherit = 'product.product'

    @api.model
    def _pos_stock_context(self, config):
        """Stock context for the location this Point of Sale ships from."""
        location = config.picking_type_id.default_location_src_id
        if location:
            return {'location': location.id}
        warehouse = config.warehouse_id or config.picking_type_id.warehouse_id
        if warehouse:
            return {'warehouse_id': warehouse.id}
        return {}

    def _pos_free_qty_map(self, config):
        """Free-to-use quantity of each product in this shop, keyed by id."""
        products = self.with_context(**self._pos_stock_context(config))
        return {product.id: product.free_qty for product in products}

    @api.model
    def get_pos_free_qty(self, product_ids, config_id):
        """Return free quantity for the POS screen.

        Keys are product ids as strings so the browser can read them after
        the JSON round-trip. The Point of Sale decides whether to block;
        this method only reports the quantity in the shop.
        """
        config = self.env['pos.config'].browse(config_id).exists()
        if not config:
            return {}
        config.check_access('read')
        products = self.browse(product_ids).exists()
        if not products:
            return {}
        products.check_access('read')
        quantities = products._pos_free_qty_map(config)
        return {str(product_id): qty for product_id, qty in quantities.items()}
