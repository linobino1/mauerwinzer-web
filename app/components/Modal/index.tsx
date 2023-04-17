import React, { useEffect, useRef } from "react";
import classes from "./index.module.css";
import { useNavigate } from "@remix-run/react";


export type Props = {
  title?: string
  closable?: boolean
  children?: React.ReactNode
}

export const Modal: React.FC<Props> = ({
  children, title,
}) => {
  const navigate = useNavigate();
  const modal = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // close modal on click outside
    document.body.addEventListener('click', (e) => {
      if (!modal.current?.contains(e.target as Node)) {
        navigate('?modal=false', { preventScrollReset: true });
      }
    });

    // lock body scroll
    // in combination with the preventScrollReset prop on the navigate function,
    // the scroll position is not reset when the modal is closed
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    }
  });;
 
  return (
    <div ref={modal} className={classes.container}>
      <div className={classes.header}>
        { title && (
          <div>{ title }</div>
        )}
        <button className={classes.close} onClick={() => navigate('?modal=false', { preventScrollReset: true })} />
      </div>
      <div className={classes.content}>{/* this div is necessary to center the content */}
        { children }
      </div>
    </div> 
  )
};

export default Modal;