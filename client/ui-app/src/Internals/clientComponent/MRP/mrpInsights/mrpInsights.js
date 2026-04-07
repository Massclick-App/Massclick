import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';

import './mrpInsights.css';

export default function MRPInsights({ data = [] }) {
  const safeData = Array.isArray(data)
    ? data.filter(item => item && typeof item === 'object')
    : [];

  if (!safeData.length) {
    return (
      <div className="mrp-insights-empty">
        <p>No requirements yet</p>
        <span>Your published requirements will appear here</span>
      </div>
    );
  }

  return (
    <div className="mrp-insights">
      <div className="mrp-insights-header">
        <h3>Requirement Insights</h3>
        <span>{safeData.length} active</span>
      </div>

      <div className="mrp-insights-list">
        {safeData.map(item => (
          <Accordion
            key={item._id}
            disableGutters
            elevation={0}
            className="mrp-insight-card"
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              className="mrp-insight-summary"
            >
              <Box className="mrp-insight-summary-content">
                <div className="mrp-insight-main">
                  <Typography className="mrp-insight-title">
                    {item.categoryId || '—'}
                  </Typography>

                  <div className="mrp-insight-meta">
                    <span>📍 {item.location || '—'}</span>
                    {item.createdAt && (
                      <span>
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                <Chip
                  label="New"
                  size="small"
                  className="mrp-insight-chip"
                />
              </Box>
            </AccordionSummary>

            <AccordionDetails className="mrp-insight-details">
              <Typography className="mrp-insight-description">
                {item.description || 'No description provided'}
              </Typography>

            </AccordionDetails>
          </Accordion>
        ))}
      </div>
    </div>
  );
}
