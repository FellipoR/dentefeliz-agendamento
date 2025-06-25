
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

        {/* Information Section with Tabs */}
        <div className="mt-12">
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="info">Informações Importantes</TabsTrigger>
              <TabsTrigger value="dentist">Sobre o Dentista</TabsTrigger>
              <TabsTrigger value="location">Localização</TabsTrigger>
            </TabsList>
            
            <TabsContent value="info" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Informações Importantes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 text-sm">
                    <div>
                      <h4 className="font-medium text-base mb-2">Antes da Consulta</h4>
                      <ul className="text-muted-foreground space-y-1">
                        <li>• Chegue 15 minutos antes do horário agendado</li>
                        <li>• Traga documentos pessoais (RG e CPF)</li>
                        <li>• Informe sobre medicamentos que está tomando</li>
                        <li>• Relate histórico de problemas dentários</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-base mb-2">Cancelamentos</h4>
                      <ul className="text-muted-foreground space-y-1">
                        <li>• Cancele com pelo menos 24h de antecedência</li>
                        <li>• Use o sistema online ou ligue para a clínica</li>
                        <li>• Reagendamentos podem ser feitos pelo sistema</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-base mb-2">Formas de Pagamento</h4>
                      <ul className="text-muted-foreground space-y-1">
                        <li>• Dinheiro, cartão de débito ou crédito</li>
                        <li>• PIX aceito</li>
                        <li>• Parcelamento disponível para tratamentos</li>
                        <li>• Convênios odontológicos aceitos</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="dentist" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Sobre o Dentista</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-4">
                    <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                      👨‍⚕️
                    </div>
                    <div>
                      <h3 className="font-semibold text-xl">Dr. João Silva</h3>
                      <p className="text-muted-foreground">CRO 12345-SP</p>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium mb-2">Formação Acadêmica</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>• Graduação em Odontologia - Universidade de São Paulo (USP)</li>
                          <li>• Especialização em Implantodontia - APCD</li>
                          <li>• Pós-graduação em Estética Dental</li>
                          <li>• 15 anos de experiência clínica</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-medium mb-3">Redes Sociais</h4>
                        <div className="flex justify-center gap-3">
                          <Button variant="outline" size="sm">
                            📘 Facebook
                          </Button>
                          <Button variant="outline" size="sm">
                            📷 Instagram
                          </Button>
                          <Button variant="outline" size="sm">
                            💼 LinkedIn
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="location" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Localização</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-base mb-2">Clínica Dente Feliz</h4>
                      <p className="text-muted-foreground">
                        Rua das Flores, 123<br/>
                        Centro - São Paulo/SP<br/>
                        CEP: 01234-567
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-base mb-2">Contato</h4>
                      <div className="text-muted-foreground space-y-1">
                        <p>📞 Telefone: (11) 3333-4444</p>
                        <p>📱 WhatsApp: (11) 99999-8888</p>
                        <p>✉️ Email: contato@dentefeliz.com.br</p>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-base mb-2">Horário de Funcionamento</h4>
                      <div className="text-muted-foreground space-y-1">
                        <p>Segunda a Sexta: 8h às 18h</p>
                        <p>Sábado e Domingo: Fechado</p>
                        <p>Feriados: Consulte disponibilidade</p>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-base mb-2">Como Chegar</h4>
                      <p className="text-muted-foreground text-sm">
                        Localizada no centro da cidade, próximo ao metrô República. 
                        Estacionamento disponível nas proximidades.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default SchedulingSystem;
