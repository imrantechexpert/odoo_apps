from markupsafe import Markup, escape

from odoo import _, api, fields, models
from odoo.exceptions import ValidationError


VISION_VALUE_FIELDS = [
    'vision_right_sph',
    'vision_right_cyl',
    'vision_right_axis',
    'vision_right_va',
    'vision_left_sph',
    'vision_left_cyl',
    'vision_left_axis',
    'vision_left_va',
    'vision_advise',
    'vision_signature',
]


class PosOrderLine(models.Model):
    _inherit = 'pos.order.line'

    is_vision_lens = fields.Boolean(
        related='product_id.product_tmpl_id.is_vision_lens',
        string='Vision Lens',
        store=True,
    )
    order_state = fields.Selection(related='order_id.state')
    vision_right_sph = fields.Selection(selection='_selection_sph', string='Right SPH', validate=False)
    vision_right_cyl = fields.Selection(selection='_selection_cyl', string='Right CYL', validate=False)
    vision_right_axis = fields.Char(string='Right Axis')
    vision_right_va = fields.Selection(selection='_selection_va', string='Right V.A.', validate=False)
    vision_left_sph = fields.Selection(selection='_selection_sph', string='Left SPH', validate=False)
    vision_left_cyl = fields.Selection(selection='_selection_cyl', string='Left CYL', validate=False)
    vision_left_axis = fields.Char(string='Left Axis')
    vision_left_va = fields.Selection(selection='_selection_va', string='Left V.A.', validate=False)
    vision_advise = fields.Text(string='Advise')
    vision_signature = fields.Binary(string='Signature', attachment=False)
    vision_summary = fields.Char(string='Prescription', compute='_compute_vision_summary')

    @api.constrains(
        'vision_right_cyl', 'vision_right_axis',
        'vision_left_cyl', 'vision_left_axis',
    )
    def _check_axis_when_cylinder(self):
        for line in self:
            missing = []
            if line._vision_cylinder_needs_axis(line.vision_right_cyl) and not (line.vision_right_axis or '').strip():
                missing.append(_("right eye"))
            if line._vision_cylinder_needs_axis(line.vision_left_cyl) and not (line.vision_left_axis or '').strip():
                missing.append(_("left eye"))
            if missing:
                raise ValidationError(_(
                    "Enter the axis for the %(eyes)s. A cylinder needs an axis.",
                    eyes=", ".join(missing),
                ))

    def _vision_cylinder_needs_axis(self, value):
        text = (value or '').strip()
        if not text:
            return False
        try:
            return float(text) != 0
        except ValueError:
            return True

    @api.model
    def _selection_sph(self):
        return self.env['pos.vision.value']._selection_values('sph')

    @api.model
    def _selection_cyl(self):
        return self.env['pos.vision.value']._selection_values('cyl')

    @api.model
    def _selection_va(self):
        return self.env['pos.vision.value']._selection_values('va')

    @api.depends(
        'is_vision_lens',
        'vision_right_sph', 'vision_right_cyl', 'vision_right_axis', 'vision_right_va',
        'vision_left_sph', 'vision_left_cyl', 'vision_left_axis', 'vision_left_va',
    )
    def _compute_vision_summary(self):
        for line in self:
            if not line.is_vision_lens:
                line.vision_summary = False
                continue
            parts = []
            right = line._vision_eye_summary('right')
            left = line._vision_eye_summary('left')
            if right:
                parts.append(_("R %(values)s", values=right))
            if left:
                parts.append(_("L %(values)s", values=left))
            line.vision_summary = ' · '.join(parts) or False

    def _vision_eye_summary(self, side):
        self.ensure_one()
        values = [
            self['vision_%s_sph' % side],
            self['vision_%s_cyl' % side],
            self['vision_%s_axis' % side],
            self['vision_%s_va' % side],
        ]
        return ' / '.join(value for value in values if value)

    def _vision_card_html(self):
        """Read-only card used on the POS order. Editing stays on the line form."""
        self.ensure_one()

        def cell(value):
            return escape(value or '—')

        def eye_table(side):
            return Markup(
                '<table class="table table-sm table-bordered bg-white mb-0">'
                '<thead><tr><th>SPH</th><th>CYL</th><th>AXIS</th><th>V.A.</th></tr></thead>'
                '<tbody><tr><td>{}</td><td>{}</td><td>{}</td><td>{}</td></tr></tbody>'
                '</table>'
            ).format(
                cell(self['vision_%s_sph' % side]),
                cell(self['vision_%s_cyl' % side]),
                cell(self['vision_%s_axis' % side]),
                cell(self['vision_%s_va' % side]),
            )

        signature = Markup('')
        if self.vision_signature and self.id:
            signature = Markup(
                '<img src="/web/image/pos.order.line/%s/vision_signature" alt="Signature"/>'
            ) % self.id
        advise = escape(self.vision_advise or '—')
        return Markup(
            '<div class="o_vision_prescription_card mb-3">'
            '<div class="o_vision_card_product fw-bold">{}</div>'
            '<div class="o_vision_card_eyes">'
            '<div class="o_vision_eye_box">'
            '<div class="o_vision_eye_title">RIGHT EYE</div>{}'
            '</div>'
            '<div class="o_vision_eye_box">'
            '<div class="o_vision_eye_title">LEFT EYE</div>{}'
            '</div>'
            '</div>'
            '<div class="o_vision_card_footer">'
            '<div><span class="o_vision_label">Signature</span>{}</div>'
            '<div><span class="o_vision_label">Advise</span><div style="white-space:pre-wrap">{}</div></div>'
            '</div></div>'
        ).format(
            escape(self.full_product_name or self.product_id.display_name or ''),
            eye_table('right'),
            eye_table('left'),
            signature or escape('—'),
            advise,
        )

    def _load_pos_data_fields(self, config):
        field_names = super()._load_pos_data_fields(config)
        for name in VISION_VALUE_FIELDS:
            if name not in field_names:
                field_names.append(name)
        return field_names

    def action_open_vision_prescription(self):
        self.ensure_one()
        return {
            'type': 'ir.actions.act_window',
            'name': _('Vision Prescription'),
            'res_model': 'pos.order.line',
            'res_id': self.id,
            'view_mode': 'form',
            'views': [(self.env.ref('pos_vision_lens.pos_order_line_vision_form').id, 'form')],
            'target': 'new',
        }
