{
    'name': 'POS Vision Lens',
    'version': '20.0.1.0.0',
    'category': 'Sales/Point of Sale',
    'summary': 'Eye prescription card on the Point of Sale for optical shops',
    'description': """
Sell lenses from the Point of Sale with a proper prescription card.
Right eye and left eye stay separate. SPH, CYL, and visual acuity are
dropdowns you can edit. Axis, advise, and a drawn signature are saved
on the order line and shown again on the POS order.
    """,
    'author': 'Dynasol Technologies',
    'website': 'https://dynasol.pk',
    'license': 'LGPL-3',
    'images': [
        'static/description/banner.png',
        'static/description/pos_card.png',
        'static/description/backend_order.png',
        'static/description/receipt.png',
    ],
    'depends': ['point_of_sale'],
    'data': [
        'security/ir.access.csv',
        'data/pos_vision_value_data.xml',
        'views/pos_vision_value_views.xml',
        'views/product_template_views.xml',
        'views/pos_order_views.xml',
        'receipt/pos_order_receipt.xml',
    ],
    'assets': {
        'point_of_sale._assets_pos': [
            'pos_vision_lens/static/src/app/**/*',
        ],
        'web.assets_backend': [
            'pos_vision_lens/static/src/backend/**/*',
        ],
    },
    'installable': True,
    'application': False,
}
