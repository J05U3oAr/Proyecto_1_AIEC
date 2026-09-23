import { ChatWidget } from '../components/widget/ChatWidget';
import '../index.css';
import { AGIChatWidgetProps } from './types';

export function AGIChatWidget(props: AGIChatWidgetProps) {
  return <ChatWidget {...props} />;
}
