from odoo import api, fields, models


class PosVisionValue(models.Model):
    _name = 'pos.vision.value'
    _description = 'Vision Prescription Value'
    _inherit = ['pos.load.mixin']
    _order = 'value_type, sequence, name'

    name = fields.Char(string='Value', required=True)
    value_type = fields.Selection(
        selection=[
            ('sph', 'SPH'),
            ('cyl', 'CYL'),
            ('va', 'V.A.'),
        ],
        string='Type',
        required=True,
        index=True,
    )
    sequence = fields.Integer(default=10)
    active = fields.Boolean(default=True)

    _value_unique = models.Constraint(
        'unique (value_type, name)',
        'This value already exists for that type.',
    )

    @api.onchange('name', 'value_type')
    def _onchange_numeric_sequence(self):
        if self.value_type in ('sph', 'cyl') and self.name:
            try:
                self.sequence = int(round(float(self.name) * 100))
            except ValueError:
                return

    @api.model
    def _selection_values(self, value_type):
        records = self.search([('value_type', '=', value_type), ('active', '=', True)])
        if value_type == 'va':
            records = records.sorted(key=lambda record: (record.sequence, record.name or ''))
        else:
            def sort_key(record):
                try:
                    return (0, float(record.name), record.sequence)
                except (TypeError, ValueError):
                    return (1, 0.0, record.sequence)
            records = records.sorted(key=sort_key)
        return [(record.name, record.name) for record in records]

    @api.model
    def _load_pos_data_domain(self, data):
        return [('active', '=', True)]

    @api.model
    def _load_pos_data_fields(self, config):
        return ['id', 'name', 'value_type', 'sequence']
