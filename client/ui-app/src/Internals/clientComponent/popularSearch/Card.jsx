import React from 'react';
import { createScopedClassNames } from '../../../utils/createScopedClassNames';
import styles from './Card.module.css';

const cx = createScopedClassNames(styles);

const Card = ({ card, onEnquireClick, isSubmitting }) => {
  return (
    <article className={cx('card')}>
      <div className={cx('cardContent')}>
        <div className={cx('imageWrapper')}>
          {card.image ? (
            <>
              <img
                src={card.image}
                alt={card.alt}
                className={cx('cardImage')}
                loading="lazy"
                decoding="async"
              />
              <div className={cx('cardOverlay')} />
            </>
          ) : (
            <div className={cx('cardImageEmpty')} />
          )}
        </div>

        <div className={cx('cardBody')}>
          <h3 className={cx('cardTitle')}>{card.title}</h3>
          <p className={cx('cardSubtitle')}>{card.alt}</p>
          <button
            className={cx('cardButton')}
            onClick={() => onEnquireClick(card)}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Sending...' : card.buttonText}
          </button>
        </div>
      </div>
    </article>
  );
};

export default Card;
