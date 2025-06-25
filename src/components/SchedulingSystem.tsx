
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';
import { format, addDays, isSameDay, isAfter, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface User {
  name?: string;
  email?: string;
  username?: string;
  type: 'client' | 'admin';
}

interface Appointment {
  id: string;
  clientEmail: string;
  clientName: string;
  date: string;
  time: string;
  status: 'scheduled' | 'cancelled';
}

interface SchedulingSystemProps {
  user: User;
  onLogout: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const SchedulingSystem: React.FC<SchedulingSystemProps> = ({ 
  user, 
  onLogout, 
  isDarkMode, 
  toggleDarkMode 
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [userAppointments, setUserAppointments] = useState<Appointment[]>([]);
  const { toast } = useToast();

  const timeSlots = [
    '08:00', '09:00', '10:00', '11:00',
    '13:00', '14:00', '15:00', '16:00', '17:00'
  ];

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = () => {
    const storedAppointments = JSON.parse(localStorage.getItem('appointments') || '[]');
    setAppointments(storedAppointments);
    
    if (user.type === 'client') {
      const userAppts = storedAppointments.filter(
        (apt: Appointment) => apt.clientEmail === user.email && apt.status === 'scheduled'
      );
      setUserAppointments(userAppts);
    }
  };

  const isTimeSlotAvailable = (date: Date, time: string) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return !appointments.some(apt => 
      apt.date === dateStr && 
      apt.time === time && 
      apt.status === 'scheduled'
    );
  };

  const isWeekday = (date: Date) => {
    const day = date.getDay();
    return day >= 1 && day <= 5; // Monday to Friday
  };

  const isPastDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return isBefore(date, today);
  };

  const scheduleAppointment = (time: string) => {
    if (!selectedDate || !user.email) return;

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const newAppointment: Appointment = {
      id: Date.now().toString(),
      clientEmail: user.email,
      clientName: user.name || '',
      date: dateStr,
      time,
      status: 'scheduled'
    };

    const updatedAppointments = [...appointments, newAppointment];
    setAppointments(updatedAppointments);
    localStorage.setItem('appointments', JSON.stringify(updatedAppointments));
    
    loadAppointments();
    
    toast({
      title: "Consulta agendada!",
      description: `Agendado para ${format(selectedDate, 'dd/MM/yyyy', { locale: ptBR })} às ${time}h`
    });
  };

  const cancelAppointment = (appointmentId: string) => {
    const updatedAppointments = appointments.map(apt =>
      apt.id === appointmentId ? { ...apt, status: 'cancelled' as const } : apt
    );
    
    setAppointments(updatedAppointments);
    localStorage.setItem('appointments', JSON.stringify(updatedAppointments));
    
    loadAppointments();
    
    toast({
      title: "Consulta cancelada",
      description: "Sua consulta foi cancelada com sucesso"
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-primary">🦷 Dente Feliz</h1>
            <span className="text-muted-foreground">
              {user.type === 'admin' ? 'Painel Administrativo' : `Olá, ${user.name}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={toggleDarkMode}
              className="p-2"
            >
              {isDarkMode ? '☀️' : '🌙'}
            </Button>
            <Button variant="outline" onClick={onLogout}>
              Sair
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {user.type === 'client' ? (
          // Client View
          <div className="grid md:grid-cols-2 gap-8">
            {/* Scheduling Section */}
            <Card>
              <CardHeader>
                <CardTitle>Agendar Consulta</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label>Selecione uma data:</Label>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => !isWeekday(date) || isPastDate(date)}
                      locale={ptBR}
                      className="rounded-md border"
                    />
                  </div>
                  
                  {selectedDate && isWeekday(selectedDate) && !isPastDate(selectedDate) && (
                    <div>
                      <Label>Horários disponíveis para {format(selectedDate, 'dd/MM/yyyy', { locale: ptBR })}:</Label>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {timeSlots.map(time => (
                          <Button
                            key={time}
                            variant={isTimeSlotAvailable(selectedDate, time) ? "outline" : "secondary"}
                            disabled={!isTimeSlotAvailable(selectedDate, time)}
                            onClick={() => scheduleAppointment(time)}
                            className="h-10"
                          >
                            {time}h
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* My Appointments */}
            <Card>
              <CardHeader>
                <CardTitle>Minhas Consultas</CardTitle>
              </CardHeader>
              <CardContent>
                {userAppointments.length === 0 ? (
                  <p className="text-muted-foreground">Nenhuma consulta agendada.</p>
                ) : (
                  <div className="space-y-3">
                    {userAppointments.map(apt => (
                      <div key={apt.id} className="flex justify-between items-center p-3 border rounded">
                        <div>
                          <p className="font-medium">
                            {format(new Date(apt.date), 'dd/MM/yyyy', { locale: ptBR })}
                          </p>
                          <p className="text-sm text-muted-foreground">{apt.time}h</p>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => cancelAppointment(apt.id)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          // Admin View
          <Card>
            <CardHeader>
              <CardTitle>Todos os Agendamentos</CardTitle>
            </CardHeader>
            <CardContent>
              {appointments.filter(apt => apt.status === 'scheduled').length === 0 ? (
                <p className="text-muted-foreground">Nenhuma consulta agendada.</p>
              ) : (
                <div className="space-y-3">
                  {appointments
                    .filter(apt => apt.status === 'scheduled')
                    .sort((a, b) => new Date(a.date + ' ' + a.time).getTime() - new Date(b.date + ' ' + b.time).getTime())
                    .map(apt => (
                      <div key={apt.id} className="flex justify-between items-center p-4 border rounded">
                        <div>
                          <p className="font-medium">{apt.clientName}</p>
                          <p className="text-sm text-muted-foreground">{apt.clientEmail}</p>
                          <p className="text-sm">
                            {format(new Date(apt.date), 'dd/MM/yyyy', { locale: ptBR })} às {apt.time}h
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Dentist Info Section */}
        <div className="mt-12 grid md:grid-cols-3 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Sobre o Dentista</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-3">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  👨‍⚕️
                </div>
                <div>
                  <h3 className="font-semibold">Dr. João Silva</h3>
                  <p className="text-sm text-muted-foreground">CRO 12345-SP</p>
                </div>
                <div className="text-sm space-y-1">
                  <p>• Graduação em Odontologia - USP</p>
                  <p>• Especialização em Implantodontia</p>
                  <p>• 15 anos de experiência</p>
                </div>
                <div className="flex justify-center gap-3">
                  <Button variant="outline" size="sm">
                    📘 Facebook
                  </Button>
                  <Button variant="outline" size="sm">
                    📷 Instagram
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Localização</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium">Clínica Dente Feliz</h4>
                  <p className="text-sm text-muted-foreground">
                    Rua das Flores, 123<br/>
                    Centro - São Paulo/SP<br/>
                    CEP: 01234-567
                  </p>
                </div>
                <div>
                  <h4 className="font-medium">Contato</h4>
                  <p className="text-sm text-muted-foreground">
                    📞 (11) 3333-4444<br/>
                    📱 (11) 99999-8888<br/>
                    ✉️ contato@dentefeliz.com.br
                  </p>
                </div>
                <div>
                  <h4 className="font-medium">Horário de Funcionamento</h4>
                  <p className="text-sm text-muted-foreground">
                    Segunda a Sexta: 8h às 18h<br/>
                    Sábado e Domingo: Fechado
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informações Importantes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div>
                  <h4 className="font-medium">Antes da Consulta</h4>
                  <p className="text-muted-foreground">
                    • Chegue 15 minutos antes<br/>
                    • Traga documentos pessoais<br/>
                    • Informe sobre medicamentos
                  </p>
                </div>
                <div>
                  <h4 className="font-medium">Cancelamentos</h4>
                  <p className="text-muted-foreground">
                    • Cancele com 24h de antecedência<br/>
                    • Use o sistema ou ligue para a clínica
                  </p>
                </div>
                <div>
                  <h4 className="font-medium">Formas de Pagamento</h4>
                  <p className="text-muted-foreground">
                    • Dinheiro, cartão ou PIX<br/>
                    • Parcelamento disponível<br/>
                    • Convênios aceitos
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SchedulingSystem;
