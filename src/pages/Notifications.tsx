import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useNotifications, useNotificationSettings } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Settings, Trash2, CheckCircle, Circle, Bell, BellOff } from 'lucide-react';
import { formatInTimeZone } from 'date-fns-tz';
import { parseISO } from 'date-fns';

const TZ = 'Australia/Melbourne';

export default function Notifications() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [severityFilter, setSeverityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const { notifications, isLoading, unreadCount, markAsRead, markAsUnread, deleteNotifications } = 
    useNotifications({
      severity: severityFilter,
      type: typeFilter,
      unreadOnly: showUnreadOnly,
    });

  const { settings, updateSettings } = useNotificationSettings();

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const selectAll = () => {
    if (selectedIds.size === notifications?.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notifications?.map(n => n.id) || []));
    }
  };

  const handleMarkAsRead = () => {
    if (selectedIds.size > 0) {
      markAsRead.mutate(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  const handleMarkAsUnread = () => {
    if (selectedIds.size > 0) {
      markAsUnread.mutate(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  const handleDelete = () => {
    if (selectedIds.size > 0 && confirm(`Delete ${selectedIds.size} notification(s)?`)) {
      deleteNotifications.mutate(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'warn': return 'default';
      case 'info': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <Layout>
      <div className="container mx-auto p-6 max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Notifications</h1>
            <p className="text-muted-foreground mt-1">
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </p>
          </div>
          
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Notification Settings</SheetTitle>
              </SheetHeader>
              
              <div className="space-y-6 mt-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">Quiet Hours</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Start</Label>
                      <Input 
                        type="time" 
                        value={settings?.quiet_hours_start || '21:00:00'}
                        onChange={(e) => updateSettings.mutate({ quiet_hours_start: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>End</Label>
                      <Input 
                        type="time" 
                        value={settings?.quiet_hours_end || '08:00:00'}
                        onChange={(e) => updateSettings.mutate({ quiet_hours_end: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold">Channels</h3>
                  <div className="flex items-center justify-between">
                    <Label>In-app notifications</Label>
                    <Switch 
                      checked={settings?.channel_inapp ?? true}
                      onCheckedChange={(checked) => updateSettings.mutate({ channel_inapp: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Email notifications</Label>
                    <Switch 
                      checked={settings?.channel_email ?? false}
                      onCheckedChange={(checked) => updateSettings.mutate({ channel_email: checked })}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold">Preferences</h3>
                  <div className="flex items-center justify-between">
                    <Label>Daily digest</Label>
                    <Switch 
                      checked={settings?.digest_daily ?? true}
                      onCheckedChange={(checked) => updateSettings.mutate({ digest_daily: checked })}
                    />
                  </div>
                  {settings?.digest_daily && (
                    <div>
                      <Label>Digest time</Label>
                      <Input 
                        type="time" 
                        value={settings?.digest_time || '08:30:00'}
                        onChange={(e) => updateSettings.mutate({ digest_time: e.target.value })}
                      />
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <Label>Enable nudges</Label>
                    <Switch 
                      checked={settings?.nudges_enabled ?? true}
                      onCheckedChange={(checked) => updateSettings.mutate({ nudges_enabled: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Critical only</Label>
                    <Switch 
                      checked={settings?.critical_only ?? false}
                      onCheckedChange={(checked) => updateSettings.mutate({ critical_only: checked })}
                    />
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Filters & Actions */}
        <Card className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Checkbox 
                checked={selectedIds.size === notifications?.length && notifications?.length > 0}
                onCheckedChange={selectAll}
              />
              <span className="text-sm text-muted-foreground">
                {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
              </span>
            </div>

            {selectedIds.size > 0 && (
              <>
                <Button size="sm" variant="outline" onClick={handleMarkAsRead}>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Mark read
                </Button>
                <Button size="sm" variant="outline" onClick={handleMarkAsUnread}>
                  <Circle className="h-3 w-3 mr-1" />
                  Mark unread
                </Button>
                <Button size="sm" variant="destructive" onClick={handleDelete}>
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </Button>
              </>
            )}

            <div className="flex-1" />

            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="text-sm border rounded px-2 py-1"
            >
              <option value="all">All severities</option>
              <option value="info">Info</option>
              <option value="warn">Warning</option>
              <option value="critical">Critical</option>
            </select>

            <Button 
              size="sm" 
              variant={showUnreadOnly ? 'default' : 'outline'}
              onClick={() => setShowUnreadOnly(!showUnreadOnly)}
            >
              {showUnreadOnly ? <BellOff className="h-3 w-3 mr-1" /> : <Bell className="h-3 w-3 mr-1" />}
              {showUnreadOnly ? 'Unread' : 'All'}
            </Button>
          </div>
        </Card>

        {/* Notifications List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-full" />
              </Card>
            ))}
          </div>
        ) : notifications && notifications.length > 0 ? (
          <div className="space-y-3">
            {notifications.map(notif => (
              <Card 
                key={notif.id}
                className={`p-4 transition-colors ${
                  notif.read_at ? 'opacity-60' : ''
                } ${selectedIds.has(notif.id) ? 'ring-2 ring-primary' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <Checkbox 
                    checked={selectedIds.has(notif.id)}
                    onCheckedChange={() => toggleSelect(notif.id)}
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold">{notif.title}</h3>
                      <Badge variant={getSeverityColor(notif.severity)}>
                        {notif.severity}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2">{notif.body}</p>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        {formatInTimeZone(parseISO(notif.created_at), TZ, 'MMM d, h:mm a')}
                      </span>
                      {notif.action_url && (
                        <Button 
                          size="sm" 
                          variant="link" 
                          className="h-auto p-0"
                          onClick={() => window.location.href = notif.action_url!}
                        >
                          Open →
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-2">No notifications</h3>
            <p className="text-sm text-muted-foreground">
              {showUnreadOnly ? "You're all caught up!" : "You don't have any notifications yet."}
            </p>
          </Card>
        )}
      </div>
    </Layout>
  );
}