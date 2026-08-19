import ContentPage from '../ContentPage.jsx'
import photo from '../assets/img/routine.webp'
import html from '../content/routine.html?raw'

export default function RoutinePage() {
  return <ContentPage photo={photo} photoAlt="כלב מרחרח בדשא גבוה בקצה שביל, ברצועה משוחררת" html={html} />
}
