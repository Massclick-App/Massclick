import React from 'react';
import styled from 'styled-components';

const Card = ({ title, image }) => {
  return (
    <StyledWrapper>
      <div className="card-flip">
        <div className="card-flip-inner">
          {/* Front */}
          <div className="card-flip-front">
            <div className="card-img-wrap">
              <img src={image} alt={title} className="card-img" loading="lazy" decoding="async" />
            </div>
            <div className="card-body">
              <p className="card-name">{title}</p>
              <span className="card-cta">Explore</span>
            </div>
          </div>

          {/* Back */}
          <div className="card-flip-back">
            <div className="back-content">
              <svg stroke="#f97316" xmlnsXlink="http://www.w3.org/1999/xlink" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" height="40px" width="40px" fill="none" strokeWidth={2}>
                <g strokeLinejoin="round" strokeLinecap="round">
                  <path d="M10 25L20 35L40 10" />
                </g>
              </svg>
              <p className="back-text">Ready to Explore?</p>
            </div>
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  width: 100%;
  height: 100%;

  .card-flip {
    width: 100%;
    height: 100%;
    perspective: 1000px;
  }

  .card-flip-inner {
    position: relative;
    width: 100%;
    height: 100%;
    transition: transform 0.6s;
    transform-style: preserve-3d;
  }

  .card-flip:hover .card-flip-inner {
    transform: rotateX(180deg);
  }

  .card-flip-front,
  .card-flip-back {
    position: absolute;
    width: 100%;
    height: 100%;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    display: flex;
    flex-direction: row;
    align-items: stretch;
    border-radius: 14px;
    background: #fff;
    border: 1.5px solid rgba(226, 232, 240, 0.85);
    overflow: hidden;
  }

  .card-flip-front {
    flex-direction: row;
  }

  .card-flip-back {
    transform: rotateX(180deg);
    background: linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%);
    border-color: #f97316;
    justify-content: center;
    align-items: center;
  }

  .back-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    color: #f97316;
  }

  .back-text {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
    color: #f97316;
  }

  .card-img-wrap {
    width: 36%;
    flex-shrink: 0;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .card-img {
    width: 86%;
    height: 86%;
    object-fit: contain;
    display: block;
    transition: transform 0.35s ease;
  }

  .card-flip:hover .card-img {
    transform: scale(1.04);
  }

  .card-body {
    width: 64%;
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 6px;
  }

  .card-name {
    margin: 0;
    font-size: 0.97rem;
    font-weight: 700;
    color: #111827;
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .card-cta {
    display: inline-flex;
    align-items: center;
    gap: 1px;
    font-size: 0.8rem;
    font-weight: 600;
    color: #f97316;
    transition: gap 0.2s ease;
  }

  .card-flip:hover .card-cta {
    gap: 4px;
  }
`;

export default Card;
